import assert from "node:assert/strict";
import test from "node:test";

import {
  getDailyNotificationCap,
  listNotificationsForClinic,
  markNotificationFailedForClinic,
  markNotificationSentForClinic,
  queueNotificationForClinic,
  resetNotificationStoresForTests,
} from "@/services/notificationService";

test.beforeEach(() => {
  resetNotificationStoresForTests();
});

test("notification service queues notifications and replays by idempotency key", () => {
  const first = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "INVOICE_SENT",
    channel: "EMAIL",
    patientId: "pat_1",
    recipientEmail: "USER@example.com",
    idempotencyKey: "invoice-send:inv_1",
    now: new Date("2026-03-01T01:00:00.000Z"),
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.data.replayed, false);
  assert.equal(first.data.notification.status, "PENDING");
  assert.equal(first.data.notification.recipientEmail, "user@example.com");

  const replay = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "INVOICE_SENT",
    channel: "EMAIL",
    patientId: "pat_1",
    recipientEmail: "user@example.com",
    idempotencyKey: "invoice-send:inv_1",
    now: new Date("2026-03-01T01:02:00.000Z"),
  });
  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.notification.id, first.data.notification.id);

  const listed = listNotificationsForClinic({ clinicId: "clinic_1" });
  assert.equal(listed.length, 1);
});

test("notification service enforces 3/day cap per clinic recipient channel and type", () => {
  const baseNow = new Date("2026-03-01T08:00:00.000Z");
  const cap = getDailyNotificationCap();
  for (let i = 0; i < cap; i += 1) {
    const queued = queueNotificationForClinic({
      clinicId: "clinic_1",
      type: "REMINDER_24H",
      channel: "SMS",
      patientId: "pat_1",
      recipientPhone: "+639171234567",
      now: new Date(baseNow.getTime() + i * 60_000),
    });
    assert.equal(queued.ok, true);
  }

  const blocked = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "REMINDER_24H",
    channel: "SMS",
    patientId: "pat_1",
    recipientPhone: "+639171234567",
    now: new Date("2026-03-01T12:00:00.000Z"),
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.code, "DAILY_NOTIFICATION_CAP_REACHED");
    assert.equal(blocked.status, 429);
  }

  const nextDay = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "REMINDER_24H",
    channel: "SMS",
    patientId: "pat_1",
    recipientPhone: "+639171234567",
    now: new Date("2026-03-02T08:00:00.000Z"),
  });
  assert.equal(nextDay.ok, true);
});

test("notification service status transitions and tenant scoping work", () => {
  const queued = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "BOOKING_CONFIRMATION",
    channel: "EMAIL",
    patientId: "pat_1",
    appointmentId: "appt_1",
    recipientEmail: "patient@example.com",
  });
  assert.equal(queued.ok, true);
  if (!queued.ok) return;

  const sent = markNotificationSentForClinic({
    clinicId: "clinic_1",
    notificationId: queued.data.notification.id,
    sentAt: new Date("2026-03-01T09:30:00.000Z"),
  });
  assert.equal(sent.ok, true);
  if (sent.ok) {
    assert.equal(sent.data.status, "SENT");
    assert.equal(sent.data.sentAt, "2026-03-01T09:30:00.000Z");
  }

  const wrongClinic = markNotificationFailedForClinic({
    clinicId: "clinic_2",
    notificationId: queued.data.notification.id,
    errorMessage: "No access",
  });
  assert.equal(wrongClinic.ok, false);
  if (!wrongClinic.ok) assert.equal(wrongClinic.code, "NOTIFICATION_NOT_FOUND");

  const listed = listNotificationsForClinic({ clinicId: "clinic_1", appointmentId: "appt_1" });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, "SENT");
});


test("notification service validates required channel recipient fields", () => {
  const noEmail = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "INVOICE_SENT",
    channel: "EMAIL",
    patientId: "pat_1",
  });
  assert.equal(noEmail.ok, false);
  if (!noEmail.ok) assert.equal(noEmail.code, "RECIPIENT_EMAIL_REQUIRED");

  const noPhone = queueNotificationForClinic({
    clinicId: "clinic_1",
    type: "REMINDER_1H",
    channel: "SMS",
    patientId: "pat_1",
  });
  assert.equal(noPhone.ok, false);
  if (!noPhone.ok) assert.equal(noPhone.code, "RECIPIENT_PHONE_REQUIRED");
});
