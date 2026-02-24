import assert from "node:assert/strict";
import test from "node:test";

import { resetInMemoryCacheForTests } from "@/lib/cache";
import { createInvoiceForClinic, resetInvoiceStoresForTests, updateInvoiceForClinic } from "@/services/invoiceService";
import { getAnalyticsDashboardForClinic } from "@/services/analyticsService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";
import {
  resetInternalAppointmentStoreForTests,
  seedInternalAppointmentStoreForTests,
} from "@/services/appointmentService";

function iso(offsetDays: number, hour = 9, minute = 0) {
  const d = new Date(Date.UTC(2026, 1, 24 + offsetDays, hour, minute, 0));
  return d.toISOString();
}

test.beforeEach(() => {
  resetInMemoryCacheForTests();
  resetInvoiceStoresForTests();
  resetInternalAppointmentStoreForTests();
  resetInternalPatientStoreForTests();
});

test("analytics service aggregates clinic metrics and caches results", async () => {
  seedInternalAppointmentStoreForTests([
    {
      id: "apt_1",
      clinicId: "clinic_1",
      patientId: "pat_1",
      staffId: "staff_1",
      serviceId: "svc_consult",
      startTime: iso(-1, 9),
      endTime: iso(-1, 9, 30),
      status: "COMPLETED",
      source: "STAFF",
      notes: null,
      cancellationReason: null,
      createdAt: iso(-1, 8),
      updatedAt: iso(-1, 8),
      deletedAt: null,
    },
    {
      id: "apt_2",
      clinicId: "clinic_1",
      patientId: "pat_2",
      staffId: "staff_1",
      serviceId: "svc_followup",
      startTime: iso(-2, 10),
      endTime: iso(-2, 10, 30),
      status: "NO_SHOW",
      source: "STAFF",
      notes: null,
      cancellationReason: null,
      createdAt: iso(-2, 9),
      updatedAt: iso(-2, 9),
      deletedAt: null,
    },
    {
      id: "apt_3",
      clinicId: "clinic_2",
      patientId: "pat_other",
      staffId: "staff_2",
      serviceId: "svc_other",
      startTime: iso(-1, 11),
      endTime: iso(-1, 11, 30),
      status: "COMPLETED",
      source: "STAFF",
      notes: null,
      cancellationReason: null,
      createdAt: iso(-1, 10),
      updatedAt: iso(-1, 10),
      deletedAt: null,
    },
  ] as any);

  const inv1 = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    appointmentId: "apt_1",
    dueDate: iso(1),
    currency: "PHP",
    items: [{ description: "Consult", quantity: 1, unitPrice: "1000.00" }],
  });
  assert.equal(inv1.ok, true);
  const inv1Paid = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: inv1.ok ? inv1.data.id : "",
    patch: { status: "PAID", paidAmount: "1000.00", paymentMethod: "CASH" },
  });
  assert.equal(inv1Paid.ok, true);

  const inv2 = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_2",
    appointmentId: "apt_2",
    dueDate: iso(-1),
    currency: "PHP",
    items: [{ description: "Follow-up", quantity: 1, unitPrice: "500.00" }],
  });
  assert.equal(inv2.ok, true);
  const inv2Overdue = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: inv2.ok ? inv2.data.id : "",
    patch: { status: "OVERDUE" },
  });
  assert.equal(inv2Overdue.ok, true);

  const invOther = createInvoiceForClinic({
    clinicId: "clinic_2",
    patientId: "pat_other",
    appointmentId: "apt_3",
    dueDate: iso(1),
    currency: "PHP",
    items: [{ description: "Other", quantity: 1, unitPrice: "9999.00" }],
  });
  assert.equal(invOther.ok, true);

  const first = await getAnalyticsDashboardForClinic({
    clinicId: "clinic_1",
    days: 7,
    now: new Date(Date.UTC(2026, 1, 24, 12, 0, 0)),
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.data.cache.hit, false);
  assert.equal(first.data.summary.appointmentsTotal, 2);
  assert.equal(first.data.summary.completedAppointments, 1);
  assert.equal(first.data.summary.noShows, 1);
  assert.equal(first.data.summary.invoicesTotal, 2);
  assert.equal(first.data.summary.paidInvoices, 1);
  assert.equal(first.data.summary.overdueInvoices, 1);
  assert.equal(first.data.summary.totalBilledCents, 150000);
  assert.equal(first.data.summary.totalCollectedCents, 100000);
  assert.equal(first.data.summary.outstandingCents, 50000);
  assert.equal(first.data.serviceBreakdown.length >= 1, true);
  assert.equal(first.data.serviceBreakdown.every((item) => item.serviceId !== "svc_other"), true);

  const second = await getAnalyticsDashboardForClinic({
    clinicId: "clinic_1",
    days: 7,
    now: new Date(Date.UTC(2026, 1, 24, 12, 0, 10)),
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.data.cache.hit, true);
  assert.equal(second.data.summary.totalBilledCents, first.data.summary.totalBilledCents);
});
