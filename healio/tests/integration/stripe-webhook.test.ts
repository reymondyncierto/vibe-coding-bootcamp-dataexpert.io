import crypto from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";
import { POST as createPatient } from "@/app/api/v1/patients/route";
import { POST as stripeWebhook } from "@/app/api/v1/webhooks/stripe/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";
import { resetStripeWebhookStateForTests } from "@/services/stripeService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

function signStripePayload(payload: string, secret: string, timestamp = 1700000000) {
  const signed = `${timestamp}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

async function createFixtureInvoice() {
  const patient = await createPatient(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "Webhook",
        lastName: "Integration",
        phone: "+639188800001",
        email: "webhook.integration@example.com",
      }),
    }),
  );
  expect(patient.status).toBe(201);
  const patientBody = (await patient.json()) as any;

  const invoice = await createInvoice(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        patientId: patientBody.data.id,
        dueDate: "2026-03-01T00:00:00.000Z",
        currency: "PHP",
        items: [{ description: "Consultation", quantity: 1, unitPrice: "1000.00" }],
      }),
    }),
  );
  expect(invoice.status).toBe(201);
  const invoiceBody = (await invoice.json()) as any;
  return invoiceBody.data.id as string;
}

describe("stripe webhook integration", () => {
  beforeEach(() => {
    resetInternalPatientStoreForTests();
    resetInvoiceStoresForTests();
    resetStripeWebhookStateForTests();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  });

  it("reconciles an invoice payment and ignores duplicate events", async () => {
    const invoiceId = await createFixtureInvoice();
    const payload = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", payment_intent: "pi_123", metadata: { invoiceId } } },
    });

    const webhookResponse = await stripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signStripePayload(payload, process.env.STRIPE_WEBHOOK_SECRET!),
        },
        body: payload,
      }),
    );
    expect(webhookResponse.status).toBe(200);
    const webhookBody = (await webhookResponse.json()) as any;
    expect(webhookBody.success).toBe(true);
    expect(webhookBody.data.action).toBe("invoice_reconciled");
    expect(webhookBody.data.invoiceId).toBe(invoiceId);

    const detail = await getInvoice(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
      { params: { id: invoiceId } },
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as any;
    expect(detailBody.data.status).toBe("PAID");
    expect(detailBody.data.paymentMethod).toBe("STRIPE");
    expect(detailBody.data.stripePaymentIntentId).toBe("pi_123");

    const duplicate = await stripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signStripePayload(payload, process.env.STRIPE_WEBHOOK_SECRET!),
        },
        body: payload,
      }),
    );
    expect(duplicate.status).toBe(200);
    const duplicateBody = (await duplicate.json()) as any;
    expect(duplicateBody.data.duplicate).toBe(true);
    expect(duplicateBody.data.action).toBe("ignored");
  });

  it("rejects invalid signatures", async () => {
    const invalidSignature = await stripeWebhook(
      new Request("http://localhost:3000/api/v1/webhooks/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" },
        body: JSON.stringify({
          id: "evt_invalid",
          type: "checkout.session.completed",
          data: { object: {} },
        }),
      }),
    );
    expect(invalidSignature.status).toBe(400);
  });
});
