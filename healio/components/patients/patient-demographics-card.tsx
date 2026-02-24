"use client";

import type { PatientDetail } from "@/schemas/patient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border/80 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

export function PatientDemographicsCard({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demographics</CardTitle>
        <CardDescription>Front desk essentials and patient contact details.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <DetailRow label="Phone" value={patient.phone} />
        <DetailRow label="Email" value={patient.email ?? "No email on file"} />
        <DetailRow
          label="Date of Birth"
          value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "Not recorded"}
        />
        <DetailRow
          label="Last Updated"
          value={new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(patient.updatedAt))}
        />
        <div className="sm:col-span-2 rounded-control border border-border/80 bg-app/50 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Front Desk Notes</p>
          <p className="mt-1 text-sm text-ink">
            {patient.notes?.trim() || "No front-desk notes yet. Add scheduling preferences or reminders in a future edit drawer flow."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
