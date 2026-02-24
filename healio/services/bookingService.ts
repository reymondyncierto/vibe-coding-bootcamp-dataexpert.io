import {
  createAppointmentFromPublicBooking,
  DEFAULT_BOOKING_RULES,
  getPublicSlotsByClinicSlug,
  listPublicBookingRecordsForValidation,
} from "@/services/appointmentService";
import {
  publicBookingCreateResultSchema,
  type PublicBookingCreateInput,
  type PublicBookingCreateResult,
} from "@/schemas/appointment";
import { upsertPatientFromPublicBooking } from "@/services/patientService";

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

export type CreatePublicBookingResult =
  | {
      ok: true;
      data: PublicBookingCreateResult;
      replayed: boolean;
      idempotencyKey: string;
    }
  | {
      ok: false;
      code:
        | PublicBookingValidationResult["ok"] extends false
          ? never
          : never
        | "CLINIC_NOT_FOUND"
        | "SERVICE_NOT_FOUND"
        | "SLOT_UNAVAILABLE"
        | "IDEMPOTENCY_IN_PROGRESS"
        | "INVALID_SLOT_START"
        | "BOOKING_IN_PAST"
        | "BOOKING_LEAD_TIME_VIOLATION"
        | "BOOKING_ADVANCE_LIMIT_VIOLATION"
        | "DUPLICATE_BOOKING";
      message: string;
      status: number;
      details?: unknown;
      idempotencyKey?: string;
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

export async function createPublicBooking(
  payload: PublicBookingCreateInput,
  options?: { idempotencyKey?: string; now?: Date },
): Promise<CreatePublicBookingResult> {
  let slotStart: Date;
  try {
    slotStart = toDate(payload.slotStartTime);
  } catch {
    return {
      ok: false,
      code: "INVALID_SLOT_START",
      message: "Invalid booking slot start time.",
      status: 400,
    };
  }

  const slotDate = slotStart.toISOString().slice(0, 10);
  const slotsLookup = await getPublicSlotsByClinicSlug({
    clinicSlug: payload.clinicSlug,
    serviceId: payload.serviceId,
    date: slotDate,
    now: options?.now,
  });

  if (!slotsLookup.ok) {
    return {
      ok: false,
      code: slotsLookup.code,
      message:
        slotsLookup.code === "CLINIC_NOT_FOUND" ? "Clinic not found." : "Service not found.",
      status: 404,
    };
  }

  let idempotencyKey = options?.idempotencyKey?.trim() || "";
  let reservation:
    | IdempotencyReserveResult<PublicBookingCreateResult>
    | undefined;

  if (idempotencyKey) {
    reservation = reservePublicBookingIdempotencyKey<PublicBookingCreateResult>(idempotencyKey);
    if (reservation.status === "IN_PROGRESS") {
      return {
        ok: false,
        code: "IDEMPOTENCY_IN_PROGRESS",
        message: "A booking request with this idempotency key is already being processed.",
        status: 409,
        idempotencyKey,
      };
    }
    if (reservation.status === "REPLAY") {
      return {
        ok: true,
        data: reservation.response,
        replayed: true,
        idempotencyKey,
      };
    }
  }

  const validation = validatePublicBookingBusinessRules({
    payload,
    clinicTimezone: slotsLookup.timezone,
    now: options?.now,
    existingBookings: listPublicBookingRecordsForValidation(payload.clinicSlug),
  });

  if (!validation.ok) {
    if (reservation?.status === "ACQUIRED") {
      releasePublicBookingIdempotencyKey(idempotencyKey);
    }
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
      details: validation.details,
      status: validation.code === "DUPLICATE_BOOKING" ? 409 : 422,
    };
  }

  if (!idempotencyKey) {
    idempotencyKey = validation.duplicateFingerprint;
    reservation = reservePublicBookingIdempotencyKey<PublicBookingCreateResult>(idempotencyKey);
  }

  if (!reservation) {
    reservation = reservePublicBookingIdempotencyKey<PublicBookingCreateResult>(idempotencyKey);
  }
  if (reservation.status === "IN_PROGRESS") {
    return {
      ok: false,
      code: "IDEMPOTENCY_IN_PROGRESS",
      message: "A booking request with this idempotency key is already being processed.",
      status: 409,
      idempotencyKey,
    };
  }

  if (reservation.status === "REPLAY") {
    return {
      ok: true,
      data: reservation.response,
      replayed: true,
      idempotencyKey,
    };
  }

  try {
    const matchingSlot = slotsLookup.slots.find((slot) => slot.startTime === slotStart.toISOString());
    if (!matchingSlot) {
      releasePublicBookingIdempotencyKey(idempotencyKey);
      return {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: "Selected slot is no longer available.",
        status: 409,
        idempotencyKey,
      };
    }

    const patient = await upsertPatientFromPublicBooking({
      clinicSlug: payload.clinicSlug,
      firstName: payload.patient.firstName,
      lastName: payload.patient.lastName,
      email: payload.patient.email,
      phone: payload.patient.phone,
    });

    const bookingId = `book_${crypto.randomUUID()}`;
    const appointment = await createAppointmentFromPublicBooking({
      bookingId,
      clinicSlug: payload.clinicSlug,
      patientId: patient.id,
      patientEmail: patient.email,
      serviceId: payload.serviceId,
      serviceName: slotsLookup.service.name,
      slotStartTime: matchingSlot.startTime,
      slotEndTime: matchingSlot.endTime,
    });

    const result = publicBookingCreateResultSchema.parse({
      bookingId,
      appointmentId: appointment.id,
      patientId: patient.id,
      clinicSlug: payload.clinicSlug,
      serviceId: payload.serviceId,
      slotStartTime: appointment.slotStartTime,
      slotEndTime: appointment.slotEndTime,
      status: "SCHEDULED",
      idempotencyKey,
    });

    completePublicBookingIdempotencyKey(idempotencyKey, result);

    return {
      ok: true,
      data: result,
      replayed: false,
      idempotencyKey,
    };
  } catch (error) {
    releasePublicBookingIdempotencyKey(idempotencyKey);
    throw error;
  }
}
