import test from "node:test";
import assert from "node:assert/strict";

import {
  createAppointmentForClinic,
  deleteAppointmentForClinic,
  resetInternalAppointmentStoreForTests,
  updateAppointmentForClinic,
} from "@/services/appointmentService";
import {
  getPatientAttendanceMetrics,
  resetPatientAttendanceMetricsForTests,
} from "@/services/patientService";

const CLINIC_ID = "clinic_1";

function isoHoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

async function createFixtureAppointment(input?: Partial<{ patientId: string; startTime: string }>) {
  const result = await createAppointmentForClinic({
    clinicId: CLINIC_ID,
    patientId: input?.patientId ?? "patient_1",
    staffId: "staff_1",
    serviceId: "service_1",
    startTime: input?.startTime ?? isoHoursFromNow(4),
    durationMinutes: 30,
    source: "STAFF",
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture create failed");
  return result.data;
}

test.beforeEach(() => {
  resetInternalAppointmentStoreForTests();
  resetPatientAttendanceMetricsForTests();
});

test("tracks no-show count once when appointment status changes to NO_SHOW", async () => {
  const appointment = await createFixtureAppointment({ patientId: "patient_no_show" });

  const first = await updateAppointmentForClinic({
    clinicId: CLINIC_ID,
    appointmentId: appointment.id,
    patch: { status: "NO_SHOW" },
  });
  assert.equal(first.ok, true);

  const second = await updateAppointmentForClinic({
    clinicId: CLINIC_ID,
    appointmentId: appointment.id,
    patch: { status: "NO_SHOW" },
  });
  assert.equal(second.ok, true);

  const metrics = getPatientAttendanceMetrics({
    clinicId: CLINIC_ID,
    patientId: "patient_no_show",
  });
  assert.equal(metrics.noShowCount, 1);
  assert.equal(metrics.lateCancelCount, 0);
  assert.ok(metrics.lastNoShowAt);
});

test("tracks late cancel only when cancellation is within the late-cancel window", async () => {
  const lateAppointment = await createFixtureAppointment({
    patientId: "patient_late_cancel",
    startTime: isoHoursFromNow(6),
  });
  const notLateAppointment = await createFixtureAppointment({
    patientId: "patient_late_cancel",
    startTime: isoHoursFromNow(40),
  });

  const lateCancel = await updateAppointmentForClinic({
    clinicId: CLINIC_ID,
    appointmentId: lateAppointment.id,
    patch: { status: "CANCELLED", cancellationReason: "Patient cancelled same day" },
  });
  assert.equal(lateCancel.ok, true);

  const standardCancel = await updateAppointmentForClinic({
    clinicId: CLINIC_ID,
    appointmentId: notLateAppointment.id,
    patch: { status: "CANCELLED", cancellationReason: "Rescheduled next week" },
  });
  assert.equal(standardCancel.ok, true);

  const metrics = getPatientAttendanceMetrics({
    clinicId: CLINIC_ID,
    patientId: "patient_late_cancel",
  });
  assert.equal(metrics.noShowCount, 0);
  assert.equal(metrics.lateCancelCount, 1);
  assert.ok(metrics.lastLateCancelAt);
});

test("tracks late cancel when a near-term appointment is deleted", async () => {
  const appointment = await createFixtureAppointment({
    patientId: "patient_delete_cancel",
    startTime: isoHoursFromNow(2),
  });

  const deleted = await deleteAppointmentForClinic({
    clinicId: CLINIC_ID,
    appointmentId: appointment.id,
  });
  assert.equal(deleted.ok, true);

  const metrics = getPatientAttendanceMetrics({
    clinicId: CLINIC_ID,
    patientId: "patient_delete_cancel",
  });
  assert.equal(metrics.lateCancelCount, 1);
  assert.equal(metrics.noShowCount, 0);
});
