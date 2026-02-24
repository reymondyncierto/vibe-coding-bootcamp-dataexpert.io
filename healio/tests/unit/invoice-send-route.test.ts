import assert from "node:assert/strict";
import test from "node:test";

import { POST as createPatient } from "@/app/api/v1/patients/route";
import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { POST as sendInvoice } from "@/app/api/v1/invoices/[id]/send/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import { listNotificationsForClinic, resetNotificationStoresForTests } from "@/services/notificationService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

async function createFixturePatient(email?: string) {
  const res = await createPatient(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "Invoice",
        lastName: email ? "Email" : "NoEmail",
        phone: "+639199900001",
        ...(email ? { email } : {}),
      }),
    }),
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as any;
  return body.data.id as string;
}

async function createFixtureInvoice(patientId: string) {
  const res = await createInvoice(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        patientId,
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
  resetInternalPatientStoreForTests();
  resetInvoiceStoresForTests();
  resetNotificationStoresForTests();
  delete process.env.RESEND_API_KEY;
});

test("invoice send endpoint generates pay link, sends fallback email, and replays idempotently", async () => {
  const patientId = await createFixturePatient("patient@example.com");
  const invoiceId = await createFixtureInvoice(patientId);

  const first = await sendInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(first.status, 200);
  const firstBody = (await first.json()) as any;
  assert.equal(firstBody.success, true);
  assert.equal(firstBody.data.provider, "resend-fallback");
  assert.equal(firstBody.data.replayed, false);
  assert.equal(firstBody.data.notificationStatus, "SENT");
  assert.equal(firstBody.data.checkoutUrl.includes("/payments/mock-checkout"), true);

  const second = await sendInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(second.status, 200);
  const secondBody = (await second.json()) as any;
  assert.equal(secondBody.data.replayed, true);
  assert.equal(secondBody.data.notificationId, firstBody.data.notificationId);

  const notifications = listNotificationsForClinic({ clinicId: "clinic_1", patientId });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].status, "SENT");

  const detail = await getInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
    { params: { id: invoiceId } },
  );
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.data.status, "SENT");
  assert.equal(detailBody.data.stripeCheckoutUrl.includes("/payments/mock-checkout"), true);
});

test("invoice send endpoint rejects missing email, invalid id, and tenant mismatch", async () => {
  const badId = await sendInvoice(
    new Request("http://localhost:3000/api/v1/invoices/x/send", {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: "x" } },
  );
  assert.equal(badId.status, 400);

  const noEmailPatientId = await createFixturePatient();
  const noEmailInvoiceId = await createFixtureInvoice(noEmailPatientId);
  const noEmailSend = await sendInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${noEmailInvoiceId}/send`, {
      method: "POST",
      headers: authHeaders(),
    }),
    { params: { id: noEmailInvoiceId } },
  );
  assert.equal(noEmailSend.status, 409);

  const patientId = await createFixturePatient("tenant@example.com");
  const invoiceId = await createFixtureInvoice(patientId);
  const tenantMismatch = await sendInvoice(
    new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: authHeaders({ "x-healio-clinic-id": "clinic_2" }),
    }),
    { params: { id: invoiceId } },
  );
  assert.equal(tenantMismatch.status, 404);
});
