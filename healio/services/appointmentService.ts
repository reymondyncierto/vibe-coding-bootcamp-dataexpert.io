import {
  formatTimeInTimeZone,
  getWeekdayIndexForDate,
  parseTimeStringToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/utils";
import type {
  AppointmentCreateInput,
  AppointmentsListQuery,
  AppointmentStatus,
  AppointmentSummary,
  AppointmentUpdateInput,
} from "@/schemas/appointment";
import type { PublicClinicProfile, PublicService } from "@/schemas/clinic";
import {
  getPublicClinicProfileBySlug,
  getPublicServicesByClinicSlug,
} from "@/services/clinicPublicService";

export type SlotEngineBookingRules = {
  leadTimeMinutes: number;
  maxAdvanceDays: number;
  slotStepMinutes: number;
};

export type SlotEngineOperatingHours = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
};

export type SlotEngineAppointment = {
  startTime: Date | string;
  endTime: Date | string;
  status?: string | null;
};

export type SlotEngineInput = {
  date: string;
  timezone: string;
  serviceDurationMinutes: number;
  operatingHours: SlotEngineOperatingHours[];
  existingAppointments?: SlotEngineAppointment[];
  now?: Date;
  rules?: Partial<SlotEngineBookingRules>;
};

export type AvailableSlot = {
  startTime: string;
  endTime: string;
  label: string;
};

export type PublicSlotsLookupInput = {
  clinicSlug: string;
  serviceId: string;
  date: string;
  now?: Date;
};

export type PublicSlotsLookupResult =
  | {
      ok: true;
      clinic: PublicClinicProfile;
      service: PublicService;
      date: string;
      timezone: string;
      slots: AvailableSlot[];
    }
  | { ok: false; code: "CLINIC_NOT_FOUND" | "SERVICE_NOT_FOUND" };

export type PublicBookingAppointmentRecord = {
  id: string;
  bookingId: string;
  clinicSlug: string;
  patientId: string;
  serviceId: string;
  serviceName: string;
  slotStartTime: string;
  slotEndTime: string;
  status: "SCHEDULED";
  patientEmail: string;
  createdAt: string;
};

export const DEFAULT_BOOKING_RULES: SlotEngineBookingRules = {
  leadTimeMinutes: 60,
  maxAdvanceDays: 30,
  slotStepMinutes: 15,
};

const DEV_FALLBACK_OPERATING_HOURS: SlotEngineOperatingHours[] = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 4, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 5, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 6, openTime: "09:00", closeTime: "12:00" },
  { dayOfWeek: 0, openTime: "00:00", closeTime: "00:00", isClosed: true },
];
const publicBookingAppointmentStore: PublicBookingAppointmentRecord[] = [];
type InternalAppointmentRecord = AppointmentSummary & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isWalkIn?: boolean;
};
const internalAppointmentStore: InternalAppointmentRecord[] = [];

type PrismaAppointmentRow = {
  startTime: Date;
  endTime: Date;
  status: string;
};

async function getPrismaClient() {
  try {
    const mod = await import("@/lib/prisma");
    return mod.prisma;
  } catch {
    return null;
  }
}

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function isBlockingAppointment(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  return normalized !== "CANCELLED" && normalized !== "NO_SHOW";
}

export function generatePublicBookingSlots(input: SlotEngineInput): AvailableSlot[] {
  const rules: SlotEngineBookingRules = {
    ...DEFAULT_BOOKING_RULES,
    ...input.rules,
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Invalid slot date. Expected YYYY-MM-DD.");
  }

  if (!Number.isInteger(input.serviceDurationMinutes) || input.serviceDurationMinutes <= 0) {
    throw new Error("serviceDurationMinutes must be a positive integer.");
  }

  if (!Number.isInteger(rules.slotStepMinutes) || rules.slotStepMinutes <= 0) {
    throw new Error("slotStepMinutes must be a positive integer.");
  }

  const weekday = getWeekdayIndexForDate(input.date, input.timezone);
  const hours = input.operatingHours.find(
    (item) => item.dayOfWeek === weekday && !item.isClosed,
  );

  if (!hours) {
    return [];
  }

  const openMinutes = parseTimeStringToMinutes(hours.openTime);
  const closeMinutes = parseTimeStringToMinutes(hours.closeTime);
  if (closeMinutes <= openMinutes) {
    return [];
  }

  const now = input.now ?? new Date();
  const minStart = new Date(now.getTime() + rules.leadTimeMinutes * 60_000);
  const maxAdvanceCutoff = new Date(now.getTime() + rules.maxAdvanceDays * 24 * 60 * 60_000);

  const blocked = (input.existingAppointments ?? [])
    .filter((appointment) => isBlockingAppointment(appointment.status))
    .map((appointment) => ({
      startTime: normalizeDate(appointment.startTime),
      endTime: normalizeDate(appointment.endTime),
    }));

  const latestStartMinutes = closeMinutes - input.serviceDurationMinutes;
  if (latestStartMinutes < openMinutes) {
    return [];
  }

  const slots: AvailableSlot[] = [];
  for (
    let startMinutes = openMinutes;
    startMinutes <= latestStartMinutes;
    startMinutes += rules.slotStepMinutes
  ) {
    const endMinutes = startMinutes + input.serviceDurationMinutes;
    const startTime = zonedDateTimeToUtc(
      input.date,
      `${Math.floor(startMinutes / 60).toString().padStart(2, "0")}:${(startMinutes % 60)
        .toString()
        .padStart(2, "0")}`,
      input.timezone,
    );
    const endTime = zonedDateTimeToUtc(
      input.date,
      `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60)
        .toString()
        .padStart(2, "0")}`,
      input.timezone,
    );

    if (startTime < minStart) continue;
    if (startTime > maxAdvanceCutoff) continue;

    const isOverlapping = blocked.some((appointment) =>
      overlaps(startTime, endTime, appointment.startTime, appointment.endTime),
    );
    if (isOverlapping) continue;

    slots.push({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      label: formatTimeInTimeZone(startTime, input.timezone),
    });
  }

  return slots;
}

export async function getPublicSlotsByClinicSlug(
  input: PublicSlotsLookupInput,
): Promise<PublicSlotsLookupResult> {
  const [clinic, services] = await Promise.all([
    getPublicClinicProfileBySlug(input.clinicSlug),
    getPublicServicesByClinicSlug(input.clinicSlug),
  ]);

  if (!clinic) {
    return { ok: false, code: "CLINIC_NOT_FOUND" };
  }
  if (!services) {
    return { ok: false, code: "CLINIC_NOT_FOUND" };
  }

  const service = services.find((item) => item.id === input.serviceId);
  if (!service) {
    return { ok: false, code: "SERVICE_NOT_FOUND" };
  }

  let operatingHours = DEV_FALLBACK_OPERATING_HOURS;
  let existingAppointments: Array<PrismaAppointmentRow | SlotEngineAppointment> = [];

  const prisma = await getPrismaClient();
  if (prisma) {
    try {
      const clinicDb = await prisma.clinic.findFirst({
        where: { slug: input.clinicSlug, deletedAt: null },
        select: { id: true },
      });

      if (clinicDb) {
        const [hoursRows, appointmentRows] = await Promise.all([
          prisma.operatingHours.findMany({
            where: { clinicId: clinicDb.id, deletedAt: null },
            select: {
              dayOfWeek: true,
              openTime: true,
              closeTime: true,
              isClosed: true,
            },
          }),
          (async () => {
            const dayStart = zonedDateTimeToUtc(input.date, "00:00", clinic.timezone);
            const dayEnd = zonedDateTimeToUtc(input.date, "23:59", clinic.timezone);
            return prisma.appointment.findMany({
              where: {
                clinicId: clinicDb.id,
                deletedAt: null,
                startTime: { gte: dayStart, lte: dayEnd },
              },
              select: {
                startTime: true,
                endTime: true,
                status: true,
              },
            });
          })(),
        ]);

        if (hoursRows.length > 0) {
          operatingHours = hoursRows;
        }
        existingAppointments = appointmentRows as PrismaAppointmentRow[];
      }
    } catch {
      // Fall back to deterministic local fixtures when Prisma is unavailable/not generated.
    }
  }

  const memoryAppointments = listPublicBookingRecordsForValidation(input.clinicSlug)
    .filter((item) => item.serviceId === input.serviceId)
    .map((item) => ({
      startTime: item.slotStartTime,
      endTime: item.slotEndTime,
      status: item.status,
    }));
  existingAppointments = [...existingAppointments, ...memoryAppointments];

  const slots = generatePublicBookingSlots({
    date: input.date,
    timezone: clinic.timezone,
    serviceDurationMinutes: service.durationMinutes,
    operatingHours,
    existingAppointments,
    now: input.now,
  });

  return {
    ok: true,
    clinic,
    service,
    date: input.date,
    timezone: clinic.timezone,
    slots,
  };
}

export function listPublicBookingRecordsForValidation(clinicSlug: string) {
  return publicBookingAppointmentStore.filter((item) => item.clinicSlug === clinicSlug);
}

export async function createAppointmentFromPublicBooking(input: {
  bookingId: string;
  clinicSlug: string;
  patientId: string;
  patientEmail: string;
  serviceId: string;
  serviceName: string;
  slotStartTime: string;
  slotEndTime: string;
}): Promise<PublicBookingAppointmentRecord> {
  const record: PublicBookingAppointmentRecord = {
    id: `appt_${crypto.randomUUID()}`,
    bookingId: input.bookingId,
    clinicSlug: input.clinicSlug,
    patientId: input.patientId,
    patientEmail: input.patientEmail.trim().toLowerCase(),
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    slotStartTime: input.slotStartTime,
    slotEndTime: input.slotEndTime,
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  };
  publicBookingAppointmentStore.push(record);
  return record;
}

type SchedulingRuleExistingAppointment = {
  id?: string;
  staffId: string;
  startTime: Date | string;
  endTime: Date | string;
  status?: string | null;
};

export type AppointmentSchedulingRuleInput = {
  startTime: Date | string;
  endTime?: Date | string;
  durationMinutes: number;
  staffId: string;
  existingAppointments?: SchedulingRuleExistingAppointment[];
  allowDoubleBooking?: boolean;
  now?: Date;
  ignoreAppointmentId?: string;
};

export type AppointmentSchedulingRuleResult =
  | { ok: true; normalizedStartTime: Date; normalizedEndTime: Date }
  | {
      ok: false;
      code:
        | "INVALID_START_TIME"
        | "INVALID_END_TIME"
        | "INVALID_DURATION"
        | "INVALID_TIME_RANGE"
        | "PAST_APPOINTMENT"
        | "DURATION_MISMATCH"
        | "OVERLAPPING_APPOINTMENT";
      message: string;
      details?: unknown;
    };

export type AppointmentStatusRuleResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_STATUS_TRANSITION" | "CANCELLATION_REASON_REQUIRED";
      message: string;
    };

function parseDateInput(value: Date | string): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTerminalStatus(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function computeAppointmentEndTime(
  startTime: Date | string,
  durationMinutes: number,
) {
  const start = parseDateInput(startTime);
  if (!start || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  return new Date(start.getTime() + durationMinutes * 60_000);
}

export function validateAppointmentSchedulingRules(
  input: AppointmentSchedulingRuleInput,
): AppointmentSchedulingRuleResult {
  const start = parseDateInput(input.startTime);
  if (!start) {
    return {
      ok: false,
      code: "INVALID_START_TIME",
      message: "Invalid appointment start time.",
    };
  }

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      message: "Appointment duration must be a positive integer.",
    };
  }

  const computedEnd = computeAppointmentEndTime(start, input.durationMinutes);
  if (!computedEnd) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      message: "Appointment duration must be a positive integer.",
    };
  }

  let end = computedEnd;
  if (input.endTime) {
    const providedEnd = parseDateInput(input.endTime);
    if (!providedEnd) {
      return {
        ok: false,
        code: "INVALID_END_TIME",
        message: "Invalid appointment end time.",
      };
    }
    if (providedEnd.getTime() !== computedEnd.getTime()) {
      return {
        ok: false,
        code: "DURATION_MISMATCH",
        message: "Appointment end time does not match the provided duration.",
        details: {
          expectedEndTime: computedEnd.toISOString(),
          providedEndTime: providedEnd.toISOString(),
        },
      };
    }
    end = providedEnd;
  }

  if (end <= start) {
    return {
      ok: false,
      code: "INVALID_TIME_RANGE",
      message: "Appointment end time must be after start time.",
    };
  }

  const now = input.now ?? new Date();
  if (start < now) {
    return {
      ok: false,
      code: "PAST_APPOINTMENT",
      message: "Appointments cannot be scheduled in the past.",
    };
  }

  if (!input.allowDoubleBooking) {
    const conflicts = (input.existingAppointments ?? []).some((item) => {
      if (item.staffId !== input.staffId) return false;
      if (input.ignoreAppointmentId && item.id === input.ignoreAppointmentId) return false;
      const status = (item.status || "").toUpperCase();
      if (status === "CANCELLED") return false;

      const existingStart = parseDateInput(item.startTime);
      const existingEnd = parseDateInput(item.endTime);
      if (!existingStart || !existingEnd) return false;
      return start < existingEnd && existingStart < end;
    });

    if (conflicts) {
      return {
        ok: false,
        code: "OVERLAPPING_APPOINTMENT",
        message: "This appointment overlaps with an existing booking for the same staff member.",
      };
    }
  }

  return { ok: true, normalizedStartTime: start, normalizedEndTime: end };
}

export function validateAppointmentStatusTransition(input: {
  currentStatus: AppointmentStatus;
  nextStatus: AppointmentStatus;
  cancellationReason?: string | null;
}): AppointmentStatusRuleResult {
  if (input.currentStatus === input.nextStatus) {
    return { ok: true };
  }

  if (isTerminalStatus(input.currentStatus)) {
    return {
      ok: false,
      code: "INVALID_STATUS_TRANSITION",
      message: `Cannot change status after ${input.currentStatus.toLowerCase()}.`,
    };
  }

  if (input.nextStatus === "CANCELLED" && !input.cancellationReason?.trim()) {
    return {
      ok: false,
      code: "CANCELLATION_REASON_REQUIRED",
      message: "Cancellation reason is required when cancelling an appointment.",
    };
  }

  return { ok: true };
}

function toIso(date: Date | string) {
  return normalizeDate(date).toISOString();
}

function toUtcDayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { start, end };
}

export type AppointmentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export async function listAppointmentsForClinicDay(input: {
  clinicId: string;
  query: AppointmentsListQuery;
}): Promise<AppointmentSummary[]> {
  const { start, end } = toUtcDayRange(input.query.date);

  return internalAppointmentStore
    .filter((item) => item.deletedAt === null)
    .filter((item) => item.clinicId === input.clinicId)
    .filter((item) => {
      const startTime = normalizeDate(item.startTime);
      return startTime >= start && startTime <= end;
    })
    .filter((item) => (input.query.staffId ? item.staffId === input.query.staffId : true))
    .filter((item) => (input.query.status ? item.status === input.query.status : true))
    .sort((a, b) => normalizeDate(a.startTime).getTime() - normalizeDate(b.startTime).getTime())
    .map((item) => ({
      id: item.id,
      clinicId: item.clinicId,
      patientId: item.patientId,
      staffId: item.staffId,
      serviceId: item.serviceId,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
      source: item.source,
      notes: item.notes ?? null,
      cancellationReason: item.cancellationReason ?? null,
    }));
}

export async function createAppointmentForClinic(
  input: AppointmentCreateInput,
): Promise<AppointmentServiceResult<AppointmentSummary>> {
  const scheduling = validateAppointmentSchedulingRules({
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    staffId: input.staffId,
    allowDoubleBooking: input.allowDoubleBooking,
    existingAppointments: internalAppointmentStore
      .filter((item) => item.deletedAt === null)
      .filter((item) => item.clinicId === input.clinicId)
      .map((item) => ({
        id: item.id,
        staffId: item.staffId,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
      })),
  });

  if (!scheduling.ok) {
    return {
      ok: false,
      code: scheduling.code,
      message: scheduling.message,
      status: scheduling.code === "OVERLAPPING_APPOINTMENT" ? 409 : 422,
      details: scheduling.details,
    };
  }

  const nowIso = new Date().toISOString();
  const record: InternalAppointmentRecord = {
    id: `appt_staff_${crypto.randomUUID()}`,
    clinicId: input.clinicId,
    patientId: input.patientId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    startTime: scheduling.normalizedStartTime.toISOString(),
    endTime: scheduling.normalizedEndTime.toISOString(),
    status: "SCHEDULED",
    source: input.source,
    notes: input.notes ?? null,
    cancellationReason: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    isWalkIn: input.isWalkIn,
  };

  internalAppointmentStore.push(record);

  return {
    ok: true,
    data: {
      id: record.id,
      clinicId: record.clinicId,
      patientId: record.patientId,
      staffId: record.staffId,
      serviceId: record.serviceId,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      source: record.source,
      notes: record.notes,
      cancellationReason: record.cancellationReason,
    },
  };
}

export function getAppointmentByIdForClinic(clinicId: string, id: string) {
  const found = internalAppointmentStore.find(
    (item) => item.deletedAt === null && item.clinicId === clinicId && item.id === id,
  );
  if (!found) return null;
  const { deletedAt: _deletedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...summary } = found;
  return summary as AppointmentSummary;
}

export async function updateAppointmentForClinic(input: {
  clinicId: string;
  appointmentId: string;
  patch: AppointmentUpdateInput;
}): Promise<AppointmentServiceResult<AppointmentSummary>> {
  const record = internalAppointmentStore.find(
    (item) =>
      item.deletedAt === null &&
      item.clinicId === input.clinicId &&
      item.id === input.appointmentId,
  );
  if (!record) {
    return { ok: false, code: "APPOINTMENT_NOT_FOUND", message: "Appointment not found.", status: 404 };
  }

  if (input.patch.status) {
    const statusCheck = validateAppointmentStatusTransition({
      currentStatus: record.status,
      nextStatus: input.patch.status,
      cancellationReason: input.patch.cancellationReason ?? record.cancellationReason,
    });
    if (!statusCheck.ok) {
      return {
        ok: false,
        code: statusCheck.code,
        message: statusCheck.message,
        status: 422,
      };
    }
  }

  const nextStart = input.patch.startTime ?? record.startTime;
  const nextEnd = input.patch.endTime ?? record.endTime;
  if (input.patch.startTime || input.patch.endTime) {
    const durationMinutes = Math.max(
      1,
      Math.round(
        (normalizeDate(record.endTime).getTime() - normalizeDate(record.startTime).getTime()) /
          60_000,
      ),
    );
    const scheduling = validateAppointmentSchedulingRules({
      startTime: nextStart,
      endTime: nextEnd,
      durationMinutes,
      staffId: record.staffId,
      ignoreAppointmentId: record.id,
      existingAppointments: internalAppointmentStore
        .filter((item) => item.deletedAt === null && item.clinicId === input.clinicId)
        .map((item) => ({
          id: item.id,
          staffId: item.staffId,
          startTime: item.startTime,
          endTime: item.endTime,
          status: item.status,
        })),
    });
    if (!scheduling.ok) {
      return {
        ok: false,
        code: scheduling.code,
        message: scheduling.message,
        status: scheduling.code === "OVERLAPPING_APPOINTMENT" ? 409 : 422,
        details: scheduling.details,
      };
    }
    record.startTime = scheduling.normalizedStartTime.toISOString();
    record.endTime = scheduling.normalizedEndTime.toISOString();
  }

  if (input.patch.status) record.status = input.patch.status;
  if (input.patch.notes !== undefined) record.notes = input.patch.notes;
  if (input.patch.cancellationReason !== undefined) {
    record.cancellationReason = input.patch.cancellationReason;
  }
  record.updatedAt = new Date().toISOString();

  return { ok: true, data: getAppointmentByIdForClinic(input.clinicId, input.appointmentId)! };
}

export async function deleteAppointmentForClinic(input: {
  clinicId: string;
  appointmentId: string;
}): Promise<AppointmentServiceResult<{ id: string; deleted: true }>> {
  const record = internalAppointmentStore.find(
    (item) =>
      item.deletedAt === null &&
      item.clinicId === input.clinicId &&
      item.id === input.appointmentId,
  );
  if (!record) {
    return { ok: false, code: "APPOINTMENT_NOT_FOUND", message: "Appointment not found.", status: 404 };
  }
  record.deletedAt = new Date().toISOString();
  record.updatedAt = record.deletedAt;
  return { ok: true, data: { id: record.id, deleted: true } };
}

export function resetInternalAppointmentStoreForTests() {
  internalAppointmentStore.length = 0;
}

export function seedInternalAppointmentStoreForTests(records: InternalAppointmentRecord[]) {
  internalAppointmentStore.length = 0;
  internalAppointmentStore.push(...records);
}
