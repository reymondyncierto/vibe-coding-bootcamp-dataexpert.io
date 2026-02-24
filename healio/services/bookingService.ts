import { DEFAULT_BOOKING_RULES } from "@/services/appointmentService";
import type { PublicBookingCreateInput } from "@/schemas/appointment";

type BookingRecordForDuplicateCheck = {
  serviceId: string;
  slotStartTime: Date | string;
  patientEmail: string;
};

type ValidationRules = {
  leadTimeMinutes?: number;
  maxAdvanceDays?: number;
};

export type PublicBookingValidationInput = {
  payload: PublicBookingCreateInput;
  clinicTimezone: string;
  now?: Date;
  existingBookings?: BookingRecordForDuplicateCheck[];
  rules?: ValidationRules;
};

export type PublicBookingValidationResult =
  | { ok: true; duplicateFingerprint: string }
  | {
      ok: false;
      code:
        | "INVALID_SLOT_START"
        | "BOOKING_IN_PAST"
        | "BOOKING_LEAD_TIME_VIOLATION"
        | "BOOKING_ADVANCE_LIMIT_VIOLATION"
        | "DUPLICATE_BOOKING";
      message: string;
      details?: unknown;
    };

type IdempotencyEntry<T = unknown> = {
  state: "IN_PROGRESS" | "COMPLETED";
  createdAtMs: number;
  expiresAtMs: number;
  response?: T;
};

export type IdempotencyReserveResult<T = unknown> =
  | { status: "ACQUIRED" }
  | { status: "IN_PROGRESS" }
  | { status: "REPLAY"; response: T };

const DEFAULT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const idempotencyStore = new Map<string, IdempotencyEntry>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }
  return date;
}

function getLocalDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function cleanupExpiredEntries(nowMs: number) {
  for (const [key, entry] of idempotencyStore.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      idempotencyStore.delete(key);
    }
  }
}

export function buildPublicBookingDuplicateFingerprint(
  payload: Pick<PublicBookingCreateInput, "clinicSlug" | "serviceId" | "slotStartTime" | "patient">,
  clinicTimezone: string,
) {
  const slotStart = toDate(payload.slotStartTime);
  const localDate = getLocalDateKey(slotStart, clinicTimezone);
  return [
    payload.clinicSlug,
    payload.serviceId,
    localDate,
    normalizeEmail(payload.patient.email),
  ].join("|");
}

export function validatePublicBookingBusinessRules(
  input: PublicBookingValidationInput,
): PublicBookingValidationResult {
  const now = input.now ?? new Date();
  const rules = {
    leadTimeMinutes:
      input.rules?.leadTimeMinutes ?? DEFAULT_BOOKING_RULES.leadTimeMinutes,
    maxAdvanceDays:
      input.rules?.maxAdvanceDays ?? DEFAULT_BOOKING_RULES.maxAdvanceDays,
  };

  let slotStart: Date;
  try {
    slotStart = toDate(input.payload.slotStartTime);
  } catch {
    return {
      ok: false,
      code: "INVALID_SLOT_START",
      message: "Invalid booking slot start time.",
    };
  }

  if (slotStart.getTime() <= now.getTime()) {
    return {
      ok: false,
      code: "BOOKING_IN_PAST",
      message: "Patients cannot book slots in the past.",
    };
  }

  const leadThreshold = now.getTime() + rules.leadTimeMinutes * 60_000;
  if (slotStart.getTime() < leadThreshold) {
    return {
      ok: false,
      code: "BOOKING_LEAD_TIME_VIOLATION",
      message: `Minimum booking lead time is ${rules.leadTimeMinutes} minutes.`,
      details: { leadTimeMinutes: rules.leadTimeMinutes },
    };
  }

  const maxAdvanceThreshold = now.getTime() + rules.maxAdvanceDays * 24 * 60 * 60_000;
  if (slotStart.getTime() > maxAdvanceThreshold) {
    return {
      ok: false,
      code: "BOOKING_ADVANCE_LIMIT_VIOLATION",
      message: `Maximum advance booking is ${rules.maxAdvanceDays} days.`,
      details: { maxAdvanceDays: rules.maxAdvanceDays },
    };
  }

  const fingerprint = buildPublicBookingDuplicateFingerprint(
    input.payload,
    input.clinicTimezone,
  );
  const existing = input.existingBookings ?? [];
  const incomingDateKey = getLocalDateKey(slotStart, input.clinicTimezone);
  const incomingEmail = normalizeEmail(input.payload.patient.email);

  const duplicate = existing.some((item) => {
    let existingStart: Date;
    try {
      existingStart = toDate(item.slotStartTime);
    } catch {
      return false;
    }
    return (
      item.serviceId === input.payload.serviceId &&
      normalizeEmail(item.patientEmail) === incomingEmail &&
      getLocalDateKey(existingStart, input.clinicTimezone) === incomingDateKey
    );
  });

  if (duplicate) {
    return {
      ok: false,
      code: "DUPLICATE_BOOKING",
      message:
        "A booking already exists for this patient, service, and day. Please choose another time.",
    };
  }

  return { ok: true, duplicateFingerprint: fingerprint };
}

export function reservePublicBookingIdempotencyKey<T = unknown>(
  key: string,
  options?: { now?: number; ttlMs?: number },
): IdempotencyReserveResult<T> {
  const nowMs = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_IDEMPOTENCY_TTL_MS;
  cleanupExpiredEntries(nowMs);

  const existing = idempotencyStore.get(key) as IdempotencyEntry<T> | undefined;
  if (!existing) {
    idempotencyStore.set(key, {
      state: "IN_PROGRESS",
      createdAtMs: nowMs,
      expiresAtMs: nowMs + ttlMs,
    });
    return { status: "ACQUIRED" };
  }

  if (existing.state === "COMPLETED") {
    return { status: "REPLAY", response: existing.response as T };
  }

  return { status: "IN_PROGRESS" };
}

export function completePublicBookingIdempotencyKey<T = unknown>(
  key: string,
  response: T,
  options?: { now?: number; ttlMs?: number },
) {
  const nowMs = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_IDEMPOTENCY_TTL_MS;
  idempotencyStore.set(key, {
    state: "COMPLETED",
    response,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  });
}

export function releasePublicBookingIdempotencyKey(key: string) {
  idempotencyStore.delete(key);
}

export function resetPublicBookingIdempotencyStoreForTests() {
  idempotencyStore.clear();
}
