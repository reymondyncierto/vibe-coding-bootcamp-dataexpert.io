import assert from "node:assert/strict";
import test from "node:test";

import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { GET, PATCH } from "@/app/api/v1/invoices/[id]/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

async function createFixtureInvoice(clinicId = "clinic_1") {
  const res = await createInvoice(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders({ "x-healio-clinic-id": clinicId }) },
      body: JSON.stringify({
        patientId: clinicId === "clinic_1" ? "pat_1" : "pat_2",
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
});

test("invoice detail/update route returns and updates invoices", async () => {
  const invoiceId = await createFixtureInvoice();

  const detail = await GET(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
    { params: { id: invoiceId } },
  );
  assert.equal(detail.status, 200);
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.data.status, "DRAFT");
  assert.equal(detailBody.data.total, "1000.00");

  const patched = await PATCH(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        status: "SENT",
        notes: "Sent to patient via SMS",
        items: [
          { description: "Consultation", quantity: 1, unitPrice: "1000.00" },
          { description: "Medicine", quantity: 2, unitPrice: "75.50" },
        ],
        taxRatePercent: 12,
      }),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(patched.status, 200);
  const patchBody = (await patched.json()) as any;
  assert.equal(patchBody.data.status, "SENT");
  assert.equal(patchBody.data.notes, "Sent to patient via SMS");
  assert.equal(patchBody.data.subtotal, "1151.00");
  assert.equal(patchBody.data.tax, "138.12");
  assert.equal(patchBody.data.total, "1289.12");
  assert.equal(patchBody.data.items.length, 2);
});

test("invoice detail/update route rejects invalid id, missing auth, invalid patch and tenant mismatch", async () => {
  const badId = await GET(
    new Request("http://localhost:3000/api/v1/invoices/x", { headers: authHeaders() }),
    { params: { id: "x" } },
  );
  assert.equal(badId.status, 400);

  const unauth = await PATCH(
    new Request("http://localhost:3000/api/v1/invoices/inv_12345", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    }),
    { params: { id: "inv_12345" } },
  );
  assert.equal(unauth.status, 401);

  const invoiceId = await createFixtureInvoice();

  const invalidPatch = await PATCH(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({}),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(invalidPatch.status, 400);

  const otherClinicInvoiceId = await createFixtureInvoice("clinic_2");
  const tenantMismatch = await GET(
    new Request(`http://localhost:3000/api/v1/invoices/${otherClinicInvoiceId}`, {
      headers: authHeaders(),
    }),
    { params: { id: otherClinicInvoiceId } },
  );
  assert.equal(tenantMismatch.status, 404);
});
