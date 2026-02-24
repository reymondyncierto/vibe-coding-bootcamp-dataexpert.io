import {
  formatTimeInTimeZone,
  getWeekdayIndexForDate,
  parseTimeStringToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/utils";
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
  let existingAppointments: PrismaAppointmentRow[] = [];

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
