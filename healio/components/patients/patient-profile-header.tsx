"use client";

import type { PatientDetail } from "@/schemas/patient";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value: string | null) {
  if (!value) return "None scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function PatientProfileHeader({
  patient,
  onOpenEdit,
}: {
  patient: PatientDetail;
  onOpenEdit: () => void;
}) {
  const attendanceVariant =
    patient.noShowCount >= 2 || patient.lateCancelCount >= 2
      ? "danger"
      : patient.noShowCount > 0 || patient.lateCancelCount > 0
        ? "warning"
        : "success";

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{patient.fullName}</CardTitle>
              <Badge variant="primary">Patient Chart</Badge>
              <Badge variant={attendanceVariant}>
                {patient.noShowCount || patient.lateCancelCount
                  ? `Attendance ${patient.noShowCount}/${patient.lateCancelCount}`
                  : "Attendance stable"}
              </Badge>
            </div>
            <CardDescription>
              {patient.phone}
              {patient.email ? ` • ${patient.email}` : ""}
              {` • Added ${formatDate(patient.createdAt)}`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onOpenEdit}>
              Edit Patient (Drawer)
            </Button>
            <Button type="button">Add Appointment</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-control border border-border bg-app/50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">DOB</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatDate(patient.dateOfBirth)}</p>
          </div>
          <div className="rounded-control border border-border bg-app/50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Upcoming</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {formatDateTime(patient.upcomingAppointmentAt)}
            </p>
          </div>
          <div className="rounded-control border border-border bg-app/50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Last Visit</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatDateTime(patient.lastVisitAt)}</p>
          </div>
          <div className="rounded-control border border-border bg-app/50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">No-show / Late cancel</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {patient.noShowCount} / {patient.lateCancelCount}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
