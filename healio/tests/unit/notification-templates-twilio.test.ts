import assert from "node:assert/strict";
import test from "node:test";

import { renderBookingConfirmationEmail } from "@/emails/booking-confirmation";
import { renderReminderEmail } from "@/emails/reminder";
import { renderWelcomeEmail } from "@/emails/welcome";
import { sendSmsWithTwilio } from "@/lib/twilio";
import {
  listNotificationsForClinic,
  resetNotificationStoresForTests,
  sendSmsNotificationForClinic,
} from "@/services/notificationService";

test.beforeEach(() => {
  resetNotificationStoresForTests();
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
});

test("email templates render expected subject/body content", () => {
  const booking = renderBookingConfirmationEmail({
    clinicName: "Northview Clinic",
    patientName: "Jamie Cruz",
    serviceName: "General Consultation",
    appointmentLabel: "Mar 1, 2026 at 10:00 AM",
    providerName: "Dr. Santos",
    locationLabel: "Room 2",
  });
  assert.match(booking.subject, /Booking confirmed/);
  assert.match(booking.html, /Jamie Cruz/);
  assert.match(booking.text, /Dr\. Santos/);

  const reminder = renderReminderEmail({
    clinicName: "Northview Clinic",
    patientName: "Jamie Cruz",
    serviceName: "General Consultation",
    appointmentLabel: "Mar 1, 2026 at 10:00 AM",
    leadLabel: "24-hour",
  });
  assert.match(reminder.subject, /24-hour reminder/);
  assert.match(reminder.html, /Appointment Reminder/);

  const welcome = renderWelcomeEmail({
    clinicName: "Northview Clinic",
    ownerName: "Dr. Santos",
    bookingPortalUrl: "https://healio.test/book/northview",
  });
  assert.match(welcome.subject, /Welcome to Healio/);
  assert.match(welcome.html, /booking page/i);
  assert.match(welcome.text, /First steps/);
});

test("twilio adapter returns fallback provider when credentials/sdk are unavailable", async () => {
  const sent = await sendSmsWithTwilio({
    to: "+639171234567",
    body: "Reminder: your appointment is tomorrow at 10:00 AM.",
  });

  assert.equal(sent.provider, "twilio-fallback");
  assert.match(sent.sid, /^SM_mock_/);
});

test("notification service sends SMS via twilio adapter and replays idempotently", async () => {
  const first = await sendSmsNotificationForClinic({
    clinicId: "clinic_1",
    type: "REMINDER_24H",
    patientId: "pat_1",
    appointmentId: "appt_1",
    recipientPhone: "+639171234567",
    body: "Reminder: Northview Clinic appointment tomorrow at 10:00 AM.",
    idempotencyKey: "reminder:appt_1:24h",
    metadata: { appointmentId: "appt_1" },
  });

  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.data.replayed, false);
  assert.equal(first.data.notification.status, "SENT");
  assert.equal(first.data.notification.channel, "SMS");
  assert.equal(first.data.provider, "twilio-fallback");
  assert.match(first.data.providerMessageId ?? "", /^SM_mock_/);

  const replay = await sendSmsNotificationForClinic({
    clinicId: "clinic_1",
    type: "REMINDER_24H",
    patientId: "pat_1",
    appointmentId: "appt_1",
    recipientPhone: "+639171234567",
    body: "Reminder: duplicate send should replay.",
    idempotencyKey: "reminder:appt_1:24h",
  });

  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.notification.id, first.data.notification.id);

  const listed = listNotificationsForClinic({ clinicId: "clinic_1", appointmentId: "appt_1" });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, "SENT");
});
