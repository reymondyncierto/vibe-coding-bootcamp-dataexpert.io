export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function sanitizeFilenameSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .toLowerCase();
}

export function getRequestId(headers: Headers) {
  return (
    headers.get("x-request-id") ||
    headers.get("x-vercel-id") ||
    crypto.randomUUID()
  );
}

export function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function parseTimeStringToMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid time format: ${value}`);
  }
  const [, hh, mm] = match;
  return Number(hh) * 60 + Number(mm);
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

type TimeZoneDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function formatPartsToObject(parts: Intl.DateTimeFormatPart[]): TimeZoneDateParts {
  const record = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: record.year,
    month: record.month,
    day: record.day,
    hour: record.hour,
    minute: record.minute,
    second: record.second,
  };
}

export function getTimeZoneDateParts(date: Date, timeZone: string): TimeZoneDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return formatPartsToObject(formatter.formatToParts(date));
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getTimeZoneDateParts(date, timeZone);
  const asUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtcMs - date.getTime();
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const minutes = parseTimeStringToMinutes(time);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  const candidate = new Date(utcGuess.getTime() - offsetMs);

  // Recalculate once for DST transitions to stabilize local clock time.
  const secondOffsetMs = getTimeZoneOffsetMs(candidate, timeZone);
  if (secondOffsetMs !== offsetMs) {
    return new Date(utcGuess.getTime() - secondOffsetMs);
  }

  return candidate;
}

export function formatTimeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function getWeekdayIndexForDate(date: string, timeZone: string): number {
  const probe = zonedDateTimeToUtc(date, "12:00", timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(probe);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const value = map[weekday];
  if (value === undefined) {
    throw new Error(`Unable to resolve weekday for ${date} in ${timeZone}`);
  }
  return value;
}
