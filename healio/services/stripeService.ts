import crypto from "node:crypto";

import { createStripeCheckoutSession } from "@/lib/stripe";
import { moneyToCents } from "@/lib/utils";
import {
  getInvoiceByIdForClinic,
  markInvoicePaidFromStripeWebhook,
  setInvoiceStripeCheckoutLinkForClinic,
  type InvoiceServiceResult,
} from "@/services/invoiceService";

export type CreateInvoicePayLinkResult = {
  invoiceId: string;
  invoiceNumber: string;
  checkoutUrl: string;
  provider: "stripe" | "stripe-fallback";
  sessionId: string;
  total: string;
  currency: string;
  status: string;
};

export type StripeWebhookEvent =
  | {
      id: string;
      type: "checkout.session.completed";
      data: {
        object: {
          id?: string;
          payment_intent?: string | null;
          metadata?: Record<string, string | undefined> | null;
        };
      };
    }
  | {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

type StripeWebhookProcessResult = {
  handled: boolean;
  eventId: string;
  duplicate: boolean;
  action: "invoice_reconciled" | "ignored";
  invoiceId?: string;
};

function getProcessedStripeEventStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioProcessedStripeWebhookEvents?: Set<string>;
  };
  if (!globalScope.__healioProcessedStripeWebhookEvents) {
    globalScope.__healioProcessedStripeWebhookEvents = new Set();
  }
  return globalScope.__healioProcessedStripeWebhookEvents;
}

function normalizeOrigin(input?: string | null) {
  const raw = input?.trim();
  return raw && /^https?:\/\//.test(raw) ? raw.replace(/\/$/, "") : "http://localhost:3000";
}

function parseStripeSignatureHeader(header: string) {
  const parts = header.split(",").map((item) => item.trim());
  const values = new Map<string, string>();
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (!key || rest.length === 0) continue;
    values.set(key, rest.join("="));
  }
  return {
    timestamp: values.get("t") ?? null,
    signatureV1: values.get("v1") ?? null,
  };
}

export function verifyStripeWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  secret?: string | null;
}): InvoiceServiceResult<{ verified: true }> {
  const secret = input.secret?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Local/dev fallback: allow unsigned webhook only when explicitly no secret is configured.
    return { ok: true, data: { verified: true } };
  }

  const header = input.signatureHeader?.trim();
  if (!header) {
    return { ok: false, code: "MISSING_STRIPE_SIGNATURE", message: "Missing Stripe signature header.", status: 400 };
  }

  const parsed = parseStripeSignatureHeader(header);
  if (!parsed.timestamp || !parsed.signatureV1) {
    return { ok: false, code: "INVALID_STRIPE_SIGNATURE", message: "Malformed Stripe signature header.", status: 400 };
  }

  const signedPayload = `${parsed.timestamp}.${input.rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const actual = parsed.signatureV1;
  const valid =
    actual.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));

  if (!valid) {
    return { ok: false, code: "INVALID_STRIPE_SIGNATURE", message: "Stripe webhook signature verification failed.", status: 400 };
  }

  return { ok: true, data: { verified: true } };
}

export function parseStripeWebhookEvent(rawBody: string): InvoiceServiceResult<StripeWebhookEvent> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, code: "INVALID_JSON", message: "Invalid Stripe webhook JSON payload.", status: 400 };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, code: "INVALID_WEBHOOK_EVENT", message: "Invalid Stripe webhook payload.", status: 400 };
  }
  const event = parsed as any;
  if (typeof event.id !== "string" || typeof event.type !== "string" || !event.data?.object) {
    return { ok: false, code: "INVALID_WEBHOOK_EVENT", message: "Invalid Stripe webhook payload.", status: 400 };
  }
  return { ok: true, data: event as StripeWebhookEvent };
}

export function processStripeWebhookEvent(event: StripeWebhookEvent): InvoiceServiceResult<StripeWebhookProcessResult> {
  const processedEvents = getProcessedStripeEventStore();
  if (processedEvents.has(event.id)) {
    return {
      ok: true,
      data: { handled: true, eventId: event.id, duplicate: true, action: "ignored" },
    };
  }

  if (event.type !== "checkout.session.completed") {
    processedEvents.add(event.id);
    return {
      ok: true,
      data: { handled: true, eventId: event.id, duplicate: false, action: "ignored" },
    };
  }

  const sessionObject = event.data.object as {
    id?: unknown;
    payment_intent?: unknown;
    metadata?: Record<string, unknown> | null;
  };
  const metadata = sessionObject.metadata ?? {};
  const invoiceId = typeof metadata.invoiceId === "string" ? metadata.invoiceId : null;
  if (!invoiceId) {
    return {
      ok: false,
      code: "STRIPE_WEBHOOK_INVOICE_ID_MISSING",
      message: "Stripe checkout session metadata.invoiceId is required.",
      status: 400,
    };
  }

  const reconciled = markInvoicePaidFromStripeWebhook({
    invoiceId,
    stripePaymentIntentId:
      typeof sessionObject.payment_intent === "string"
        ? sessionObject.payment_intent
        : typeof sessionObject.id === "string"
          ? sessionObject.id
          : null,
  });
  if (!reconciled.ok) return reconciled;

  processedEvents.add(event.id);
  return {
    ok: true,
    data: {
      handled: true,
      eventId: event.id,
      duplicate: false,
      action: "invoice_reconciled",
      invoiceId,
    },
  };
}

export async function createInvoiceStripePayLinkForClinic(input: {
  clinicId: string;
  invoiceId: string;
  requestOrigin?: string | null;
}): Promise<InvoiceServiceResult<CreateInvoicePayLinkResult>> {
  const invoice = getInvoiceByIdForClinic(input.clinicId, input.invoiceId);
  if (!invoice) {
    return { ok: false, code: "INVOICE_NOT_FOUND", message: "Invoice not found.", status: 404 };
  }

  if (invoice.deletedAt) {
    return { ok: false, code: "INVOICE_NOT_FOUND", message: "Invoice not found.", status: 404 };
  }

  if (invoice.status === "VOID" || invoice.status === "REFUNDED") {
    return {
      ok: false,
      code: "INVOICE_NOT_PAYABLE",
      message: "Pay link cannot be created for void or refunded invoices.",
      status: 409,
    };
  }

  const totalCents = moneyToCents(invoice.total);
  const paidCents = moneyToCents(invoice.paidAmount);
  const balanceCents = totalCents - paidCents;
  if (balanceCents <= 0) {
    return {
      ok: false,
      code: "INVOICE_ALREADY_PAID",
      message: "Invoice has no remaining balance.",
      status: 409,
    };
  }

  const origin = normalizeOrigin(input.requestOrigin);
  const successUrl = `${origin}/payments/success?invoiceId=${encodeURIComponent(invoice.id)}`;
  const cancelUrl = `${origin}/payments/cancel?invoiceId=${encodeURIComponent(invoice.id)}`;

  const checkout = await createStripeCheckoutSession({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
    amountCents: balanceCents,
    customerReference: invoice.patientId,
    successUrl,
    cancelUrl,
    metadata: {
      clinicId: invoice.clinicId,
      patientId: invoice.patientId,
    },
  });

  const persisted = setInvoiceStripeCheckoutLinkForClinic({
    clinicId: input.clinicId,
    invoiceId: input.invoiceId,
    stripeCheckoutUrl: checkout.checkoutUrl,
  });
  if (!persisted.ok) return persisted;

  return {
    ok: true,
    data: {
      invoiceId: persisted.data.id,
      invoiceNumber: persisted.data.invoiceNumber,
      checkoutUrl: checkout.checkoutUrl,
      provider: checkout.provider,
      sessionId: checkout.sessionId,
      total: persisted.data.total,
      currency: persisted.data.currency,
      status: persisted.data.status,
    },
  };
}

export function resetStripeWebhookStateForTests() {
  getProcessedStripeEventStore().clear();
}
