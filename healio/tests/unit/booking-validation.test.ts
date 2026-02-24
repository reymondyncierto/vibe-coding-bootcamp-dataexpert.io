import test from "node:test";
import assert from "node:assert/strict";

import { publicBookingCreateSchema } from "@/schemas/appointment";
import {
  buildPublicBookingDuplicateFingerprint,
  completePublicBookingIdempotencyKey,
  reservePublicBookingIdempotencyKey,
  resetPublicBookingIdempotencyStoreForTests,
  validatePublicBookingBusinessRules,
} from "@/services/bookingService";

function samplePayload(overrides: Partial<{
  clinicSlug: string;
  serviceId: string;
  slotStartTime: string;
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  notes: string;
}> = {}) {
  return publicBookingCreateSchema.parse({
    clinicSlug: "northview-clinic",
    serviceId: "svc-general-consult",
    slotStartTime: "2026-03-02T02:00:00.000Z",
    patient: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+63 917 000 0000",
    },
    ...overrides,
  });
}

test("booking validation rejects past and lead-time violating slots", () => {
  const now = new Date("2026-03-02T01:30:00.000Z");

  const past = validatePublicBookingBusinessRules({
    payload: samplePayload({ slotStartTime: "2026-03-02T01:00:00.000Z" }),
    clinicTimezone: "Asia/Manila",
    now,
  });
  assert.equal(past.ok, false);
  if (!past.ok) assert.equal(past.code, "BOOKING_IN_PAST");

  const tooSoon = validatePublicBookingBusinessRules({
    payload: samplePayload({ slotStartTime: "2026-03-02T02:00:00.000Z" }),
    clinicTimezone: "Asia/Manila",
    now,
    rules: { leadTimeMinutes: 45 },
  });
  assert.equal(tooSoon.ok, false);
  if (!tooSoon.ok) assert.equal(tooSoon.code, "BOOKING_LEAD_TIME_VIOLATION");
});

test("booking validation rejects duplicate same service + patient email + local day", () => {
  const now = new Date("2026-03-01T00:00:00.000Z");
  const payload = samplePayload({
    patient: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ADA@example.com",
      phone: "+63 917 000 0000",
    },
  });

  const result = validatePublicBookingBusinessRules({
    payload,
    clinicTimezone: "Asia/Manila",
    now,
    existingBookings: [
      {
        serviceId: "svc-general-consult",
        slotStartTime: "2026-03-02T08:30:00.000Z", // same Manila local day
        patientEmail: "ada@example.com",
      },
    ],
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "DUPLICATE_BOOKING");
});

test("booking validation returns stable duplicate fingerprint and respects advance limit", () => {
  const now = new Date("2026-03-01T00:00:00.000Z");
  const payload = samplePayload();
  const fingerprint = buildPublicBookingDuplicateFingerprint(payload, "Asia/Manila");
  assert.match(fingerprint, /^northview-clinic\|svc-general-consult\|/);
  assert.match(fingerprint, /\|ada@example\.com$/);

  const tooFar = validatePublicBookingBusinessRules({
    payload: samplePayload({ slotStartTime: "2026-05-15T02:00:00.000Z" }),
    clinicTimezone: "Asia/Manila",
    now,
    rules: { maxAdvanceDays: 30, leadTimeMinutes: 0 },
  });
  assert.equal(tooFar.ok, false);
  if (!tooFar.ok) assert.equal(tooFar.code, "BOOKING_ADVANCE_LIMIT_VIOLATION");
});

test("idempotency store supports acquire, in-progress, and replay", () => {
  resetPublicBookingIdempotencyStoreForTests();
  const key = "booking:key:1";

  const first = reservePublicBookingIdempotencyKey(key, { now: 1000, ttlMs: 1000 });
  assert.equal(first.status, "ACQUIRED");

  const second = reservePublicBookingIdempotencyKey(key, { now: 1100, ttlMs: 1000 });
  assert.equal(second.status, "IN_PROGRESS");

  completePublicBookingIdempotencyKey(key, { appointmentId: "appt_1" }, { now: 1200, ttlMs: 1000 });

  const replay = reservePublicBookingIdempotencyKey<{ appointmentId: string }>(key, {
    now: 1300,
    ttlMs: 1000,
  });
  assert.equal(replay.status, "REPLAY");
  if (replay.status === "REPLAY") {
    assert.deepEqual(replay.response, { appointmentId: "appt_1" });
  }
});
