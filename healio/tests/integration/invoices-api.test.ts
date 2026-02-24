import { beforeEach, describe, expect, it } from "vitest";

import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";
import { POST as createPayLink } from "@/app/api/v1/invoices/[id]/pay-link/route";
import { POST as sendInvoice } from "@/app/api/v1/invoices/[id]/send/route";
import { POST as createPatient } from "@/app/api/v1/patients/route";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import {
  listNotificationsForClinic,
  resetNotificationStoresForTests,
} from "@/services/notificationService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";
import { resetStripeWebhookStateForTests } from "@/services/stripeService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_doctor_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

async function createFixturePatient(email = "billing.integration@example.com") {
  const response = await createPatient(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "Billing",
        lastName: "Integration",
        phone: "+639170001111",
        email,
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as any;
  return body.data.id as string;
}

async function createFixtureInvoice(patientId: string) {
  const response = await createInvoice(
    new Request("http://localhost:3000/api/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        patientId,
        dueDate: "2026-03-15T00:00:00.000Z",
        currency: "PHP",
        items: [{ description: "Consultation", quantity: 1, unitPrice: "1500.00" }],
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as any;
  return body.data.id as string;
}

describe("billing invoice integration flow", () => {
  beforeEach(() => {
    resetInternalPatientStoreForTests();
    resetInvoiceStoresForTests();
    resetNotificationStoresForTests();
    resetStripeWebhookStateForTests();
    delete process.env.RESEND_API_KEY;
  });

  it("creates pay link and sends invoice email idempotently", async () => {
    const patientId = await createFixturePatient();
    const invoiceId = await createFixtureInvoice(patientId);

    const payLinkResponse = await createPayLink(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/pay-link`, {
        method: "POST",
        headers: authHeaders(),
      }),
      { params: { id: invoiceId } },
    );
    expect(payLinkResponse.status).toBe(200);
    const payLinkBody = (await payLinkResponse.json()) as any;
    expect(payLinkBody.success).toBe(true);
    expect(payLinkBody.data.provider).toMatch(/stripe/);
    expect(payLinkBody.data.checkoutUrl).toContain("/payments/mock-checkout");

    const firstSend = await sendInvoice(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: authHeaders(),
      }),
      { params: { id: invoiceId } },
    );
    expect(firstSend.status).toBe(200);
    const firstSendBody = (await firstSend.json()) as any;
    expect(firstSendBody.success).toBe(true);
    expect(firstSendBody.data.replayed).toBe(false);
    expect(firstSendBody.data.notificationStatus).toBe("SENT");
    expect(firstSendBody.data.checkoutUrl).toContain("/payments/mock-checkout");

    const replaySend = await sendInvoice(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: authHeaders(),
      }),
      { params: { id: invoiceId } },
    );
    expect(replaySend.status).toBe(200);
    const replayBody = (await replaySend.json()) as any;
    expect(replayBody.data.replayed).toBe(true);
    expect(replayBody.data.notificationId).toBe(firstSendBody.data.notificationId);

    const notifications = listNotificationsForClinic({
      clinicId: "clinic_1",
      patientId,
      type: "INVOICE_SENT",
    });
    expect(notifications).toHaveLength(1);

    const detailResponse = await getInvoice(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}`, { headers: authHeaders() }),
      { params: { id: invoiceId } },
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = (await detailResponse.json()) as any;
    expect(detailBody.data.status).toBe("SENT");
    expect(detailBody.data.stripeCheckoutUrl).toContain("/payments/mock-checkout");
  });

  it("rejects invalid invoice id and tenant mismatch", async () => {
    const invalidId = await createPayLink(
      new Request("http://localhost:3000/api/v1/invoices/x/pay-link", {
        method: "POST",
        headers: authHeaders(),
      }),
      { params: { id: "x" } },
    );
    expect(invalidId.status).toBe(400);

    const patientId = await createFixturePatient("tenant@example.com");
    const invoiceId = await createFixtureInvoice(patientId);

    const tenantMismatch = await sendInvoice(
      new Request(`http://localhost:3000/api/v1/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: authHeaders({ "x-healio-clinic-id": "clinic_2" }),
      }),
      { params: { id: invoiceId } },
    );
    expect(tenantMismatch.status).toBe(404);
  });
});
