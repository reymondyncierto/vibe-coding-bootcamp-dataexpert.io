import assert from "node:assert/strict";
import test from "node:test";

import { GET as analyticsRoute } from "@/app/api/v1/analytics/route";
import { resetInMemoryCacheForTests } from "@/lib/cache";
import { createInvoiceForClinic, resetInvoiceStoresForTests } from "@/services/invoiceService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";
import {
  resetInternalAppointmentStoreForTests,
  seedInternalAppointmentStoreForTests,
} from "@/services/appointmentService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

function iso(daysOffset: number) {
  return new Date(Date.UTC(2026, 1, 24 + daysOffset, 9, 0, 0)).toISOString();
}

test.beforeEach(() => {
  resetInMemoryCacheForTests();
  resetInvoiceStoresForTests();
  resetInternalAppointmentStoreForTests();
  resetInternalPatientStoreForTests();
});

test("analytics route returns clinic-scoped dashboard payload", async () => {
  seedInternalAppointmentStoreForTests([
    {
      id: "apt_route_1",
      clinicId: "clinic_1",
      patientId: "pat_1",
      staffId: "staff_1",
      serviceId: "svc_1",
      startTime: iso(-1),
      endTime: iso(-1),
      status: "COMPLETED",
      source: "STAFF",
      notes: null,
      cancellationReason: null,
      createdAt: iso(-1),
      updatedAt: iso(-1),
      deletedAt: null,
    },
  ] as any);

  const inv = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    appointmentId: "apt_route_1",
    dueDate: iso(1),
    currency: "PHP",
    items: [{ description: "Consult", quantity: 1, unitPrice: "1000.00" }],
  });
  assert.equal(inv.ok, true);

  const response = await analyticsRoute(
    new Request("http://localhost:3000/api/v1/analytics?days=14", {
      headers: authHeaders(),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.clinicId, "clinic_1");
  assert.equal(body.data.range.days, 14);
  assert.equal(body.data.summary.appointmentsTotal >= 1, true);
});

test("analytics route enforces auth and query validation", async () => {
  const unauth = await analyticsRoute(new Request("http://localhost:3000/api/v1/analytics"));
  assert.equal(unauth.status, 401);

  const invalid = await analyticsRoute(
    new Request("http://localhost:3000/api/v1/analytics?days=999", { headers: authHeaders() }),
  );
  assert.equal(invalid.status, 400);
});

