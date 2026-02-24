import {
  formatTimeInTimeZone,
  getWeekdayIndexForDate,
  parseTimeStringToMinutes,
  zonedDateTimeToUtc,
} from "@/lib/utils";

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

export const DEFAULT_BOOKING_RULES: SlotEngineBookingRules = {
  leadTimeMinutes: 60,
  maxAdvanceDays: 30,
  slotStepMinutes: 15,
};

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
