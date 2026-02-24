import assert from "node:assert/strict";
import test from "node:test";

import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { POST as createPayLink } from "@/app/api/v1/invoices/[id]/pay-link/route";
import { GET as getInvoiceDetail } from "@/app/api/v1/invoices/[id]/route";
import { PATCH as patchInvoice } from "@/app/api/v1/invoices/[id]/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

async function createFixtureInvoice() {
  const res = await createInvoice(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        patientId: "pat_1",
        dueDate: "2026-03-01T00:00:00.000Z",
        currency: "PHP",
        items: [{ description: "Consultation", quantity: 1, unitPrice: "1000.00" }],
      }),
    }),
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as any;
  return body.data.id as string;
}

test.beforeEach(() => {
  resetInvoiceStoresForTests();
  delete process.env.STRIPE_SECRET_KEY;
});

test("invoice pay-link route returns fallback stripe checkout url and persists it on invoice", async () => {
  const invoiceId = await createFixtureInvoice();

  const payLink = await createPayLink(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/pay-link`, {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(payLink.status, 200);
  const payLinkBody = (await payLink.json()) as any;
  assert.equal(payLinkBody.success, true);
  assert.equal(payLinkBody.data.provider, "stripe-fallback");
  assert.equal(payLinkBody.data.checkoutUrl.includes("/payments/mock-checkout"), true);
  assert.equal(payLinkBody.data.status, "SENT");

  const detail = await getInvoiceDetail(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
    { params: { id: invoiceId } },
  );
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.data.stripeCheckoutUrl.includes("/payments/mock-checkout"), true);
  assert.equal(detailBody.data.status, "SENT");
});

test("invoice pay-link route rejects invalid id, unauthenticated, tenant mismatch, and paid invoices", async () => {
  const badId = await createPayLink(
    new Request("http://localhost:3000/api/v1/invoices/x/pay-link", {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: "x" } },
  );
  assert.equal(badId.status, 400);

  const unauth = await createPayLink(
    new Request("http://localhost:3000/api/v1/invoices/inv_12345/pay-link", { method: "POST" }),
    { params: { id: "inv_12345" } },
  );
  assert.equal(unauth.status, 401);

  const invoiceId = await createFixtureInvoice();
  const tenantMismatch = await createPayLink(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/pay-link`, {
      method: "POST",
      headers: authHeaders({ "x-healio-clinic-id": "clinic_2" }),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(tenantMismatch.status, 404);

  const payInvoiceId = await createFixtureInvoice();
  const paidPatch = await patchInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${payInvoiceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status: "PAID", paidAmount: "1000.00", paymentMethod: "CASH" }),
    }),
    { params: { id: payInvoiceId } },
  );
  assert.equal(paidPatch.status, 200);

  const paidPayLink = await createPayLink(
    new Request(`http://localhost:3000/api/v1/invoices/${payInvoiceId}/pay-link`, {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: payInvoiceId } },
  );
  assert.equal(paidPayLink.status, 409);
});
