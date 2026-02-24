import test from "node:test";
import assert from "node:assert/strict";

import {
  computeAppointmentEndTime,
  validateAppointmentSchedulingRules,
  validateAppointmentStatusTransition,
} from "@/services/appointmentService";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
  appointmentsListQuerySchema,
} from "@/schemas/appointment";

test("appointment schemas parse valid list/create/update payloads", () => {
  const list = appointmentsListQuerySchema.parse({ date: "2026-03-10", status: "SCHEDULED" });
  assert.equal(list.date, "2026-03-10");

  const create = appointmentCreateSchema.parse({
    clinicId: "clinic_1",
    patientId: "patient_1",
    staffId: "staff_1",
    serviceId: "service_1",
    startTime: "2026-03-10T01:00:00.000Z",
    durationMinutes: 30,
    source: "STAFF",
  });
  assert.equal(create.durationMinutes, 30);

  const update = appointmentUpdateSchema.parse({
    status: "CANCELLED",
    cancellationReason: "Patient requested reschedule",
  });
  assert.equal(update.status, "CANCELLED");
});

test("computeAppointmentEndTime and scheduling rules normalize valid appointments", () => {
  const end = computeAppointmentEndTime("2026-03-10T01:00:00.000Z", 45);
  assert.equal(end?.toISOString(), "2026-03-10T01:45:00.000Z");

  const result = validateAppointmentSchedulingRules({
    startTime: "2026-03-10T01:00:00.000Z",
    durationMinutes: 45,
    staffId: "staff_1",
    now: new Date("2026-03-10T00:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.normalizedEndTime.toISOString(), "2026-03-10T01:45:00.000Z");
  }
});

test("scheduling rules reject overlap and allow explicit double booking", () => {
  const overlapping = validateAppointmentSchedulingRules({
    startTime: "2026-03-10T01:15:00.000Z",
    durationMinutes: 30,
    staffId: "staff_1",
    now: new Date("2026-03-10T00:00:00.000Z"),
    existingAppointments: [
      {
        id: "appt_1",
        staffId: "staff_1",
        startTime: "2026-03-10T01:00:00.000Z",
        endTime: "2026-03-10T01:30:00.000Z",
        status: "SCHEDULED",
      },
    ],
  });
  assert.equal(overlapping.ok, false);
  if (!overlapping.ok) assert.equal(overlapping.code, "OVERLAPPING_APPOINTMENT");

  const allowed = validateAppointmentSchedulingRules({
    startTime: "2026-03-10T01:15:00.000Z",
    durationMinutes: 30,
    staffId: "staff_1",
    allowDoubleBooking: true,
    now: new Date("2026-03-10T00:00:00.000Z"),
    existingAppointments: [
      {
        id: "appt_1",
        staffId: "staff_1",
        startTime: "2026-03-10T01:00:00.000Z",
        endTime: "2026-03-10T01:30:00.000Z",
        status: "SCHEDULED",
      },
    ],
  });
  assert.equal(allowed.ok, true);
});

test("scheduling rules reject past appointments and duration mismatches", () => {
  const past = validateAppointmentSchedulingRules({
    startTime: "2026-03-10T00:30:00.000Z",
    durationMinutes: 30,
    staffId: "staff_1",
    now: new Date("2026-03-10T01:00:00.000Z"),
  });
  assert.equal(past.ok, false);
  if (!past.ok) assert.equal(past.code, "PAST_APPOINTMENT");

  const mismatch = validateAppointmentSchedulingRules({
    startTime: "2026-03-10T01:00:00.000Z",
    endTime: "2026-03-10T01:20:00.000Z",
    durationMinutes: 30,
    staffId: "staff_1",
    now: new Date("2026-03-10T00:00:00.000Z"),
  });
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.code, "DURATION_MISMATCH");
});

test("status transition rules require cancellation reason and block terminal transitions", () => {
  const missingReason = validateAppointmentStatusTransition({
    currentStatus: "SCHEDULED",
    nextStatus: "CANCELLED",
    cancellationReason: "",
  });
  assert.equal(missingReason.ok, false);
  if (!missingReason.ok) assert.equal(missingReason.code, "CANCELLATION_REASON_REQUIRED");

  const terminal = validateAppointmentStatusTransition({
    currentStatus: "COMPLETED",
    nextStatus: "SCHEDULED",
  });
  assert.equal(terminal.ok, false);
  if (!terminal.ok) assert.equal(terminal.code, "INVALID_STATUS_TRANSITION");
});
