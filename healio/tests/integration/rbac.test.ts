import { beforeEach, describe, expect, it } from "vitest";

import { POST as createAppointment } from "@/app/api/v1/appointments/route";
import { GET as auditLogsRoute } from "@/app/api/v1/audit-logs/route";
import { POST as createInvoice } from "@/app/api/v1/invoices/route";
import { POST as createPatient } from "@/app/api/v1/patients/route";
import { appendAuditLogEntry, resetAuditLogStoreForTests } from "@/services/auditLogService";
import { resetInternalAppointmentStoreForTests } from "@/services/appointmentService";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

describe("RBAC and protected route behavior", () => {
  beforeEach(() => {
    resetAuditLogStoreForTests();
    resetInternalPatientStoreForTests();
    resetInternalAppointmentStoreForTests();
    resetInvoiceStoresForTests();

    appendAuditLogEntry({
      clinicId: "clinic_1",
      actorUserId: "owner_1",
      actorRole: "OWNER",
      action: "CLINIC_SETTINGS_UPDATED",
      entityType: "clinic",
      entityId: "clinic_1",
      summary: "Booking rules changed.",
    });
  });

  it("enforces owner-only access for audit logs and allows owner reads", async () => {
    const forbidden = await auditLogsRoute(
      new Request("http://localhost:3000/api/v1/audit-logs", {
        headers: authHeaders({ "x-healio-role": "DOCTOR" }),
      }),
    );
    expect(forbidden.status).toBe(403);

    const ownerResponse = await auditLogsRoute(
      new Request("http://localhost:3000/api/v1/audit-logs?page=1&pageSize=10", {
        headers: authHeaders({ "x-healio-role": "OWNER", "x-healio-user-id": "owner_1" }),
      }),
    );
    expect(ownerResponse.status).toBe(200);
    const ownerBody = (await ownerResponse.json()) as any;
    expect(ownerBody.success).toBe(true);
    expect(ownerBody.data.items[0].clinicId).toBe("clinic_1");
    expect(ownerBody.data.chainIntegrity.ok).toBe(true);
  });

  it("rejects unauthenticated access and clinic-scope mismatches on protected create routes", async () => {
    const unauthPatients = await createPatient(
      new Request("http://localhost:3000/api/v1/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName: "Unauth", lastName: "User", phone: "+63917" }),
      }),
    );
    expect(unauthPatients.status).toBe(401);

    const patientScopeMismatch = await createPatient(
      new Request("http://localhost:3000/api/v1/patients", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          clinicId: "clinic_2",
          firstName: "Scope",
          lastName: "Mismatch",
          phone: "+639170000010",
          email: "scope@example.com",
        }),
      }),
    );
    expect(patientScopeMismatch.status).toBe(403);

    const appointmentScopeMismatch = await createAppointment(
      new Request("http://localhost:3000/api/v1/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          clinicId: "clinic_2",
          patientId: "pat_any",
          staffId: "staff_1",
          serviceId: "service_1",
          startTime: "2026-03-21T01:00:00.000Z",
          durationMinutes: 30,
        }),
      }),
    );
    expect(appointmentScopeMismatch.status).toBe(403);

    const invoiceScopeMismatch = await createInvoice(
      new Request("http://localhost:3000/api/v1/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          clinicId: "clinic_2",
          patientId: "pat_any",
          dueDate: "2026-03-01T00:00:00.000Z",
          currency: "PHP",
          items: [{ description: "Consult", quantity: 1, unitPrice: "500.00" }],
        }),
      }),
    );
    expect(invoiceScopeMismatch.status).toBe(403);
  });
});
