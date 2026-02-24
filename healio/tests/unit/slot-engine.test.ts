import test from "node:test";
import assert from "node:assert/strict";

import { generatePublicBookingSlots } from "@/services/appointmentService";
import { formatTimeInTimeZone } from "@/lib/utils";

const MANILA_WEEKDAY_HOURS = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "12:00", isClosed: false },
];

test("slot engine generates slots within clinic hours using timezone labels", () => {
  const slots = generatePublicBookingSlots({
    date: "2026-03-02", // Monday in Asia/Manila
    timezone: "Asia/Manila",
    serviceDurationMinutes: 30,
    operatingHours: MANILA_WEEKDAY_HOURS,
    now: new Date("2026-03-01T00:00:00.000Z"),
    rules: { leadTimeMinutes: 0, slotStepMinutes: 30 },
  });

  assert.equal(slots.length, 6);
  assert.equal(slots[0]?.label, "09:00");
  assert.equal(slots.at(-1)?.label, "11:30");
  assert.equal(formatTimeInTimeZone(new Date(slots[0]!.startTime), "Asia/Manila"), "09:00");
});

test("slot engine enforces lead time and excludes overlapping appointments", () => {
  const slots = generatePublicBookingSlots({
    date: "2026-03-02",
    timezone: "Asia/Manila",
    serviceDurationMinutes: 30,
    operatingHours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "11:00" }],
    now: new Date("2026-03-02T00:20:00.000Z"), // 08:20 Manila
    rules: { leadTimeMinutes: 60, slotStepMinutes: 30 },
    existingAppointments: [
      {
        startTime: "2026-03-02T02:00:00.000Z", // 10:00 Manila
        endTime: "2026-03-02T02:30:00.000Z",
        status: "SCHEDULED",
      },
      {
        startTime: "2026-03-02T01:00:00.000Z", // 09:00 Manila (ignored)
        endTime: "2026-03-02T01:30:00.000Z",
        status: "CANCELLED",
      },
    ],
  });

  const labels = slots.map((slot) => slot.label);
  assert.deepEqual(labels, ["09:30", "10:30"]);
});

test("slot engine enforces max advance booking window", () => {
  const slots = generatePublicBookingSlots({
    date: "2026-05-01",
    timezone: "Asia/Manila",
    serviceDurationMinutes: 30,
    operatingHours: [{ dayOfWeek: 5, openTime: "09:00", closeTime: "10:00" }],
    now: new Date("2026-03-01T00:00:00.000Z"),
    rules: { maxAdvanceDays: 30, leadTimeMinutes: 0, slotStepMinutes: 30 },
  });

  assert.equal(slots.length, 0);
});

test("slot engine returns empty list for closed day / missing operating hours", () => {
  const slots = generatePublicBookingSlots({
    date: "2026-03-01", // Sunday
    timezone: "America/New_York",
    serviceDurationMinutes: 30,
    operatingHours: [{ dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", isClosed: true }],
    now: new Date("2026-02-28T00:00:00.000Z"),
    rules: { leadTimeMinutes: 0 },
  });

  assert.deepEqual(slots, []);
});
