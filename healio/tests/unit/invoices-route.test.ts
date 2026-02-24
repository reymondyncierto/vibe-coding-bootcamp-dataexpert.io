import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "@/app/api/v1/invoices/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetInvoiceStoresForTests();
});

test("invoices route creates and lists invoices with filters", async () => {
  const created = await POST(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        patientId: "pat_1",
        appointmentId: "appt_1",
        dueDate: "2026-03-01T00:00:00.000Z",
        currency: "PHP",
        items: [
          { description: "Consultation", quantity: 1, unitPrice: "1000.00" },
          { description: "Supplies", quantity: 2, unitPrice: "50.00" },
        ],
        taxRatePercent: 12,
      }),
    }),
  );
  assert.equal(created.status, 201);
  const createdBody = (await created.json()) as any;
  assert.equal(createdBody.success, true);
  assert.equal(createdBody.data.invoiceNumber, "INV-2026-00001");
  assert.equal(createdBody.data.subtotal, "1100.00");
  assert.equal(createdBody.data.tax, "132.00");
  assert.equal(createdBody.data.total, "1232.00");

  const list = await GET(
    new Request("http://localhost:3000/api/v1/invoices?patientId=pat_1", {
      headers: authHeaders(),
    }),
  );
  assert.equal(list.status, 200);
  const listBody = (await list.json()) as any;
  assert.equal(listBody.success, true);
  assert.equal(listBody.data.total, 1);
  assert.equal(listBody.data.items[0].patientId, "pat_1");
});

test("invoices route rejects unauthenticated, invalid payloads, and enforces tenant scoping", async () => {
  const unauth = await GET(new Request("http://localhost:3000/api/v1/invoices"));
  assert.equal(unauth.status, 401);

  const invalid = await POST(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ patientId: "pat_1", items: [] }),
    }),
  );
  assert.equal(invalid.status, 400);

  const scopeMismatch = await POST(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        clinicId: "clinic_2",
        patientId: "pat_1",
        dueDate: "2026-03-01T00:00:00.000Z",
        currency: "PHP",
        items: [{ description: "Consultation", quantity: 1, unitPrice: "1000.00" }],
      }),
    }),
  );
  assert.equal(scopeMismatch.status, 403);

  const createClinic2 = await POST(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders({ "x-healio-clinic-id": "clinic_2" }) },
      body: JSON.stringify({
        patientId: "pat_2",
        dueDate: "2026-03-02T00:00:00.000Z",
        currency: "PHP",
        items: [{ description: "Procedure", quantity: 1, unitPrice: "2000.00" }],
      }),
    }),
  );
  assert.equal(createClinic2.status, 201);

  const listClinic1 = await GET(
    new Request("http://localhost:3000/api/v1/invoices", { headers: authHeaders() }),
  );
  const clinic1Body = (await listClinic1.json()) as any;
  assert.equal(clinic1Body.data.total, 0);

  const listClinic2 = await GET(
    new Request("http://localhost:3000/api/v1/invoices", {
      headers: authHeaders({ "x-healio-clinic-id": "clinic_2" }),
    }),
  );
  const clinic2Body = (await listClinic2.json()) as any;
  assert.equal(clinic2Body.data.total, 1);
});
