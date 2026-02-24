import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { POST as createPatient } from "@/app/api/v1/patients/route";
import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";
import { POST as stripeWebhook } from "@/app/api/v1/webhooks/stripe/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";
import { resetStripeWebhookStateForTests } from "@/services/stripeService";

function authHeaders() {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
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
      body: JSON.stringify({ firstName: "Webhook", lastName: "Patient", phone: "+639188800001", email: "webhook@example.com" }),
    }),
  );
  assert.equal(patient.status, 201);
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
  assert.equal(invoice.status, 201);
  const invoiceBody = (await invoice.json()) as any;
  return invoiceBody.data.id as string;
}

test.beforeEach(() => {
  resetInternalPatientStoreForTests();
  resetInvoiceStoresForTests();
  resetStripeWebhookStateForTests();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
});

test.after(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test("stripe webhook route verifies signature and reconciles invoice payment", async () => {
  const invoiceId = await createFixtureInvoice();
  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_1", payment_intent: "pi_123", metadata: { invoiceId } } },
  });

  const res = await stripeWebhook(
    new Request("http://localhost:3000/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signStripePayload(payload, process.env.STRIPE_WEBHOOK_SECRET!) },
      body: payload,
    }),
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.success, true);
  assert.equal(body.data.action, "invoice_reconciled");
  assert.equal(body.data.invoiceId, invoiceId);

  const detail = await getInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
    { params: { id: invoiceId } },
  );
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.data.status, "PAID");
  assert.equal(detailBody.data.paymentMethod, "STRIPE");
  assert.equal(detailBody.data.paidAmount, "1000.00");
  assert.equal(detailBody.data.stripePaymentIntentId, "pi_123");

  const dup = await stripeWebhook(
    new Request("http://localhost:3000/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signStripePayload(payload, process.env.STRIPE_WEBHOOK_SECRET!) },
      body: payload,
    }),
  );
  const dupBody = (await dup.json()) as any;
  assert.equal(dup.status, 200);
  assert.equal(dupBody.data.duplicate, true);
  assert.equal(dupBody.data.action, "ignored");
});

test("stripe webhook route rejects invalid signature and malformed event", async () => {
  const invalidSig = await stripeWebhook(
    new Request("http://localhost:3000/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" },
      body: JSON.stringify({ id: "evt_bad", type: "checkout.session.completed", data: { object: {} } }),
    }),
  );
  assert.equal(invalidSig.status, 400);

  const malformedPayload = "{not-json";
  const malformed = await stripeWebhook(
    new Request("http://localhost:3000/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signStripePayload(malformedPayload, process.env.STRIPE_WEBHOOK_SECRET!) },
      body: malformedPayload,
    }),
  );
  assert.equal(malformed.status, 400);
});
