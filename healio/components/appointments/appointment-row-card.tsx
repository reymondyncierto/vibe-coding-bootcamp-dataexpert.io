import type { AppointmentSummary } from "@/schemas/appointment";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function labelize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusVariant(status: AppointmentSummary["status"]) {
  switch (status) {
    case "CHECKED_IN":
    case "IN_PROGRESS":
      return "primary" as const;
    case "COMPLETED":
      return "success" as const;
    case "NO_SHOW":
      return "warning" as const;
    case "CANCELLED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDurationMinutes(startTime: string, endTime: string) {
  return Math.max(
    1,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
  );
}

export function AppointmentRowCard({
  appointment,
  selected = false,
  onSelect,
}: {
  appointment: AppointmentSummary;
  selected?: boolean;
  onSelect?: (appointment: AppointmentSummary) => void;
}) {
  const duration = getDurationMinutes(appointment.startTime, appointment.endTime);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(appointment)}
      className={cn(
        "w-full rounded-card border bg-surface p-4 text-left shadow-sm transition",
        "hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        selected ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </p>
          <p className="mt-1 text-base font-semibold leading-tight text-ink">
            {labelize(appointment.patientId)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {labelize(appointment.serviceId)} · {labelize(appointment.staffId)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={statusVariant(appointment.status)}>
            {labelize(appointment.status)}
          </Badge>
          <span className="text-xs text-muted">{duration} min</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full bg-app px-2 py-1">Source: {labelize(appointment.source)}</span>
        {appointment.notes ? (
          <span className="rounded-full bg-app px-2 py-1">
            Notes: {appointment.notes.slice(0, 42)}
            {appointment.notes.length > 42 ? "…" : ""}
          </span>
        ) : null}
        {appointment.cancellationReason ? (
          <span className="rounded-full bg-danger/10 px-2 py-1 text-danger">
            Cancel reason: {appointment.cancellationReason}
          </span>
        ) : null}
      </div>
    </button>
  );
}
