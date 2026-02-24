"use client";

import { useMemo, useState } from "react";

import type { AppointmentStatus, AppointmentSummary } from "@/schemas/appointment";

import { useAppointmentsList, useCreateAppointment } from "@/hooks/useAppointments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentRowCard } from "./appointment-row-card";

type StatusFilter = "ALL" | AppointmentStatus;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatLongDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function safeCreateDemoDay(
  date: string,
  create: ReturnType<typeof useCreateAppointment>,
) {
  const demoRows = [
    { hhmm: "09:00", durationMinutes: 30, patientId: "maria_santos", serviceId: "follow_up_consult", staffId: "dr_reyes" },
    { hhmm: "10:30", durationMinutes: 45, patientId: "john_cruz", serviceId: "initial_assessment", staffId: "dr_reyes" },
    { hhmm: "13:00", durationMinutes: 60, patientId: "ava_reyes", serviceId: "therapy_session", staffId: "dr_co" },
    { hhmm: "15:30", durationMinutes: 30, patientId: "walk_in_slot", serviceId: "open_slot", staffId: "dr_co" },
  ];

  let created = 0;
  let skipped = 0;

  for (const row of demoRows) {
    const startTime = new Date(`${date}T${row.hhmm}:00.000Z`).toISOString();
    try {
      await create.mutateAsync({
        patientId: row.patientId,
        serviceId: row.serviceId,
        staffId: row.staffId,
        startTime,
        durationMinutes: row.durationMinutes,
        source: "STAFF",
        notes: row.patientId === "walk_in_slot" ? "Held for same-day walk-ins." : undefined,
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return { created, skipped };
}

function MetricCard({
  title,
  value,
  tone = "neutral",
  note,
}: {
  title: string;
  value: string;
  tone?: "neutral" | "primary" | "success" | "warning";
  note: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-app text-muted";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-sm text-muted">{note}</p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${toneClass}`}>
            Live
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DailySchedule() {
  const [date, setDate] = useState(todayIsoDate);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<AppointmentSummary | null>(null);
  const [seedNote, setSeedNote] = useState<string>("");

  const createAppointment = useCreateAppointment();
  const listQuery = useAppointmentsList(
    {
      date,
      ...(status === "ALL" ? {} : { status }),
    },
    {
      retry: false,
    },
  );

  const appointments = listQuery.data ?? [];

  const metrics = useMemo(() => {
    const total = appointments.length;
    const checkedIn = appointments.filter(
      (item) => item.status === "CHECKED_IN" || item.status === "IN_PROGRESS",
    ).length;
    const completed = appointments.filter((item) => item.status === "COMPLETED").length;
    const pending = appointments.filter((item) => item.status === "SCHEDULED").length;
    const noShowRisk = appointments.filter((item) => item.status === "NO_SHOW").length;
    return { total, checkedIn, completed, pending, noShowRisk };
  }, [appointments]);

  const nextUp = useMemo(() => {
    const now = Date.now();
    return appointments.find((item) => new Date(item.startTime).getTime() >= now) ?? null;
  }, [appointments]);

  async function handleSeedDemoDay() {
    setSeedNote("");
    const result = await safeCreateDemoDay(date, createAppointment);
    setSeedNote(
      result.skipped > 0
        ? `Loaded ${result.created} demo appointments (${result.skipped} skipped because they already exist).`
        : `Loaded ${result.created} demo appointments for ${formatLongDate(date)}.`,
    );
    await listQuery.refetch();
  }

  const endpointState = listQuery.isLoading
    ? { label: "Loading", variant: "warning" as const }
    : listQuery.isError
      ? { label: "Error", variant: "danger" as const }
      : { label: "Connected", variant: "success" as const };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>Daily Schedule</CardTitle>
                  <Badge variant={endpointState.variant}>{endpointState.label}</Badge>
                </div>
                <CardDescription>
                  Bento-style timeline for front-desk triage, patient flow, and quick handoffs.
                </CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,190px)_minmax(0,180px)_auto_auto] sm:items-end">
                <label className="grid gap-1 text-sm">
                  <span className="healio-label">Date</span>
                  <Input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-label="Schedule date"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="healio-label">Status</span>
                  <Select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as StatusFilter)}
                    aria-label="Filter appointments by status"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_SHOW">No Show</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void listQuery.refetch()}
                  loading={listQuery.isFetching && !listQuery.isLoading}
                >
                  Refresh
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSeedDemoDay()}
                  loading={createAppointment.isPending}
                >
                  Load Demo Day
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {seedNote ? (
              <div className="mb-4 rounded-control border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                {seedNote}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Appointments"
                value={String(metrics.total)}
                tone="primary"
                note={formatCountLabel(metrics.pending, "scheduled")}
              />
              <MetricCard
                title="Checked In"
                value={String(metrics.checkedIn)}
                tone="success"
                note={nextUp ? `Next: ${formatTime(nextUp.startTime)}` : "No upcoming patients yet"}
              />
              <MetricCard
                title="Completed"
                value={String(metrics.completed)}
                note="Keeps handoff pacing visible for staff"
              />
              <MetricCard
                title="No-Show Watch"
                value={String(metrics.noShowRisk)}
                tone={metrics.noShowRisk > 0 ? "warning" : "neutral"}
                note="Track no-shows and late cancels without clutter"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>{formatLongDate(date)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-card border border-border bg-surface p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-52" />
                </div>
              ))
            ) : null}

            {listQuery.isError ? (
              <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
                <p className="text-sm font-semibold text-danger">Unable to load schedule</p>
                <p className="mt-1 text-sm text-muted">
                  {listQuery.error.message}
                </p>
                <p className="mt-1 text-xs text-muted">
                  The page surfaces the error state instead of redirecting away. Use Refresh after auth/session setup.
                </p>
                <div className="mt-3">
                  <Button type="button" variant="secondary" onClick={() => void listQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && appointments.length === 0 ? (
              <div className="rounded-card border border-dashed border-border bg-app p-5">
                <p className="text-sm font-semibold text-ink">
                  Your day is clear! Let&apos;s add your first appointment.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Use the floating + action or load a demo day to preview how the timeline flows.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void handleSeedDemoDay()} loading={createAppointment.isPending}>
                    Load Demo Day
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void listQuery.refetch()}>
                    Check Again
                  </Button>
                </div>
              </div>
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && appointments.length > 0
              ? appointments.map((appointment) => (
                  <AppointmentRowCard
                    key={appointment.id}
                    appointment={appointment}
                    selected={selected?.id === appointment.id}
                    onSelect={setSelected}
                  />
                ))
              : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Front Desk Cues</CardTitle>
            <CardDescription>Small cards keep dense clinic operations scannable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-control border border-border bg-surface p-3">
              <p className="text-sm font-semibold text-ink">Pending bills</p>
              <p className="mt-1 text-sm text-muted">
                Tie this to billing tasks later. Keep it visible without crowding the timeline.
              </p>
            </div>
            <div className="rounded-control border border-border bg-surface p-3">
              <p className="text-sm font-semibold text-ink">Unread messages</p>
              <p className="mt-1 text-sm text-muted">
                WhatsApp/SMS confirmations will surface here as a compact queue.
              </p>
            </div>
            <div className="rounded-control border border-border bg-surface p-3">
              <p className="text-sm font-semibold text-ink">One-click actions</p>
              <p className="mt-1 text-sm text-muted">
                Keep the global + action visible for Add Appointment, Add Patient, and Create Invoice.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Appointment: ${selected.patientId.replace(/[_-]+/g, " ")}` : "Appointment"}
        description="In-context drawer keeps workflows fast; richer quick actions land in the next task."
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button type="button" disabled>
              Quick Actions (Next Task)
            </Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-control border border-border bg-app p-4 text-sm">
              <p>
                <span className="font-semibold text-ink">Time:</span>{" "}
                <span className="text-muted">
                  {formatTime(selected.startTime)} - {formatTime(selected.endTime)}
                </span>
              </p>
              <p>
                <span className="font-semibold text-ink">Status:</span>{" "}
                <span className="text-muted">{selected.status}</span>
              </p>
              <p>
                <span className="font-semibold text-ink">Staff:</span>{" "}
                <span className="text-muted">{selected.staffId}</span>
              </p>
              <p>
                <span className="font-semibold text-ink">Service:</span>{" "}
                <span className="text-muted">{selected.serviceId}</span>
              </p>
            </div>
            <div className="rounded-control border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-ink">Notes</p>
              <p className="mt-2 text-sm text-muted">
                {selected.notes?.trim() || "No notes yet. Use the next task drawer quick actions to update status and notes."}
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
