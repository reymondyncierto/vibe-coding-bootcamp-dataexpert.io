import { createStripeCheckoutSession } from "@/lib/stripe";
import { moneyToCents } from "@/lib/utils";
import {
  getInvoiceByIdForClinic,
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

function normalizeOrigin(input?: string | null) {
  const raw = input?.trim();
  return raw && /^https?:\/\//.test(raw) ? raw.replace(/\/$/, "") : "http://localhost:3000";
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
