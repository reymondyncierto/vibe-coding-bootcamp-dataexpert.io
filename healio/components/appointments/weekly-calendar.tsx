"use client";

import { useMemo, useState } from "react";

import { useAppointmentsList } from "@/hooks/useAppointments";
import type { AppointmentSummary } from "@/schemas/appointment";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type WeekDay = {
  iso: string;
  date: Date;
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(input: Date) {
  const copy = new Date(input);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(input: Date, days: number) {
  const copy = new Date(input);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start)} - ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end)}`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function pretty(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

function WeeklyDayColumn({ day }: { day: WeekDay }) {
  const query = useAppointmentsList({ date: day.iso }, { retry: false });
  const items = query.data ?? [];

  return (
    <div className="min-w-[220px] rounded-card border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">{formatDayLabel(day.date)}</p>
            <p className="text-xs text-muted">{day.iso}</p>
          </div>
          <Badge variant={query.isError ? "danger" : items.length ? "primary" : "neutral"}>
            {query.isLoading ? "Loading" : query.isError ? "Error" : `${items.length}`}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {query.isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-control border border-border p-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))
          : null}

        {query.isError ? (
          <div className="rounded-control border border-danger/20 bg-danger/5 p-3">
            <p className="text-xs font-semibold text-danger">Unable to load</p>
            <p className="mt-1 text-xs text-muted">
              {query.error.message}
            </p>
          </div>
        ) : null}

        {!query.isLoading && !query.isError && items.length === 0 ? (
          <div className="rounded-control border border-dashed border-border bg-app p-3">
            <p className="text-xs font-semibold text-ink">No appointments</p>
            <p className="mt-1 text-xs text-muted">
              Use the + quick action to book, or switch to Day View to load demo data.
            </p>
          </div>
        ) : null}

        {!query.isLoading && !query.isError
          ? items.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-control border border-border bg-surface p-3 text-left transition",
                  "hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                )}
                title={`${pretty(item.patientId)} • ${pretty(item.serviceId)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">{formatTime(item.startTime)}</p>
                  <Badge variant={statusVariant(item.status)} className="px-2 py-0.5 text-[10px]">
                    {pretty(item.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-semibold leading-tight text-ink">
                  {pretty(item.patientId)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {pretty(item.serviceId)} · {pretty(item.staffId)}
                </p>
              </button>
            ))
          : null}

        {!query.isLoading && !query.isError && items.length > 6 ? (
          <div className="rounded-control bg-app px-3 py-2 text-xs text-muted">
            +{items.length - 6} more appointments in Day View
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WeeklyCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo<WeekDay[]>(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return { date, iso: toIsoDate(date) };
      }),
    [weekStart],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Weekly Calendar</CardTitle>
              <CardDescription>
                Scan the full week without leaving the dashboard; click into Day View for deeper actions.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAnchorDate((value) => addDays(value, -7))}
              >
                Previous Week
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAnchorDate(new Date())}
              >
                This Week
              </Button>
              <Button type="button" onClick={() => setAnchorDate((value) => addDays(value, 7))}>
                Next Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="primary">{formatWeekRange(weekStart)}</Badge>
            <span className="text-sm text-muted">
              Each column pulls the protected appointments API for that day and preserves empty/error states.
            </span>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-max grid-cols-1 gap-3 md:grid-cols-7">
              {weekDays.map((day) => (
                <WeeklyDayColumn key={day.iso} day={day} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
