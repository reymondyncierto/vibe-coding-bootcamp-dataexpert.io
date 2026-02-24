import assert from "node:assert/strict";
import test from "node:test";

import { GET as runReminderCron } from "@/app/api/cron/reminders/route";
import {
  createAppointmentFromPublicBooking,
  resetPublicBookingAppointmentStoreForTests,
} from "@/services/appointmentService";
import {
  listNotificationsForClinic,
  resetNotificationStoresForTests,
} from "@/services/notificationService";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

test.beforeEach(() => {
  resetPublicBookingAppointmentStoreForTests();
  resetNotificationStoresForTests();
  process.env.CRON_SECRET = "test-cron-secret";
});

test.after(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

async function seedPublicBookingReminderFixture(nowIso: string) {
  const now = new Date(nowIso);
  const start = new Date(now.getTime() + 24 * 60 * 60_000 + 5 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return createAppointmentFromPublicBooking({
    bookingId: "bk_1",
    clinicSlug: "northview-clinic",
    patientId: "pat_1",
    patientEmail: "patient@example.com",
    serviceId: "svc-general-consult",
    serviceName: "General Consultation",
    slotStartTime: start.toISOString(),
    slotEndTime: end.toISOString(),
  });
}

test("reminders cron route rejects invalid cron secret", async () => {
  const response = await runReminderCron(new Request("http://localhost:3000/api/cron/reminders"));
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("reminders cron route dispatches and replays 24h reminders idempotently", async () => {
  const nowIso = "2026-03-01T00:00:00.000Z";
  const fixture = await seedPublicBookingReminderFixture(nowIso);

  const first = await runReminderCron(new Request(
    `http://localhost:3000/api/cron/reminders?lead=24h&now=${encodeURIComponent(nowIso)}&windowMinutes=10`,
    { headers: { authorization: "Bearer test-cron-secret" } },
  ));
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.success, true);
  assert.equal(firstBody.data.scanned, 1);
  assert.equal(firstBody.data.emailSent, 1);
  assert.equal(firstBody.data.emailReplayed, 0);
  assert.equal(firstBody.data.failures, 0);

  const notifications = listNotificationsForClinic({
    clinicId: "dev-clinic-northview",
    appointmentId: fixture.id,
    type: "REMINDER_24H",
  });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].status, "SENT");
  assert.equal(notifications[0].channel, "EMAIL");

  const second = await runReminderCron(new Request(
    `http://localhost:3000/api/cron/reminders?lead=24h&now=${encodeURIComponent(nowIso)}&windowMinutes=10`,
    { headers: { "x-cron-secret": "test-cron-secret" } },
  ));
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.success, true);
  assert.equal(secondBody.data.scanned, 1);
  assert.equal(secondBody.data.emailSent, 0);
  assert.equal(secondBody.data.emailReplayed, 1);

  const notificationsAfterReplay = listNotificationsForClinic({
    clinicId: "dev-clinic-northview",
    appointmentId: fixture.id,
    type: "REMINDER_24H",
  });
  assert.equal(notificationsAfterReplay.length, 1);
});

test("reminders cron route validates now parameter", async () => {
  const response = await runReminderCron(new Request(
    "http://localhost:3000/api/cron/reminders?now=not-a-date",
    { headers: { authorization: "Bearer test-cron-secret" } },
  ));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "INVALID_NOW");
});
