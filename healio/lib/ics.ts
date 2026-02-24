function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtcForIcs(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export type BookingIcsEventInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTimeIso: string;
  endTimeIso: string;
  organizerEmail?: string;
};

export function createIcsEvent(input: BookingIcsEventInput) {
  const now = formatUtcForIcs(new Date());
  const start = formatUtcForIcs(new Date(input.startTimeIso));
  const end = formatUtcForIcs(new Date(input.endTimeIso));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Healio//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeIcsText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    ...(input.organizerEmail
      ? [`ORGANIZER:mailto:${escapeIcsText(input.organizerEmail)}`]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  return lines.join("\r\n");
}

export function downloadIcsFile(filename: string, icsContent: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
