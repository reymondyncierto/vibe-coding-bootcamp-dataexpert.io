"use client";

import type { PatientDetail } from "@/schemas/patient";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function MedicalField({
  label,
  value,
  emptyHint,
}: {
  label: string;
  value: string | null;
  emptyHint: string;
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className="rounded-control border border-border/80 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <Badge variant={hasValue ? "warning" : "neutral"}>
          {hasValue ? "Review" : "Empty"}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-ink">{hasValue ? value : emptyHint}</p>
    </div>
  );
}

export function PatientMedicalSummaryCard({ patient }: { patient: PatientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Summary</CardTitle>
        <CardDescription>
          Snapshot for clinicians before opening visits, documents, or SOAP note workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <MedicalField
          label="Allergies"
          value={patient.allergies}
          emptyHint="No allergies recorded yet."
        />
        <MedicalField
          label="Chronic Conditions"
          value={patient.chronicConditions}
          emptyHint="No chronic conditions recorded yet."
        />
        <MedicalField
          label="Current Medications"
          value={patient.currentMedications}
          emptyHint="No medications recorded yet."
        />
      </CardContent>
    </Card>
  );
}
