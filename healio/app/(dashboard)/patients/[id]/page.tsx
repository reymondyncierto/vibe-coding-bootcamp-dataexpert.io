"use client";

import { useState } from "react";

import { PatientDemographicsCard } from "@/components/patients/patient-demographics-card";
import { PatientBillingTab } from "@/components/patients/patient-billing-tab";
import { PatientDocumentsTab } from "@/components/patients/patient-documents-tab";
import { PatientMedicalSummaryCard } from "@/components/patients/patient-medical-summary-card";
import { PatientProfileHeader } from "@/components/patients/patient-profile-header";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { VisitNoteTimeline } from "@/components/patients/visit-note-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientDetail } from "@/hooks/usePatients";

export default function PatientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const patientQuery = usePatientDetail(params.id, { retry: false });

  if (patientQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-80" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-control" />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
          <Card>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-28 w-full rounded-card" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-28 w-full rounded-card" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-10 w-80 rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (patientQuery.isError || !patientQuery.data) {
    const isNotFound = patientQuery.error?.status === 404;
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{isNotFound ? "Patient not found" : "Unable to load patient chart"}</CardTitle>
            <Badge variant={isNotFound ? "warning" : "danger"}>
              {isNotFound ? "Empty state" : "API error"}
            </Badge>
          </div>
          <CardDescription>
            {isNotFound
              ? "This chart may belong to another clinic or the record has not been created yet."
              : patientQuery.error?.message || "Please retry the request."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-card border border-border bg-app/60 p-4 text-sm text-muted">
            Use the Patients directory to pick a valid chart, then return here without losing dashboard context.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void patientQuery.refetch()}>
              Retry
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const patient = patientQuery.data;

  return (
    <>
      <div className="space-y-4">
        <PatientProfileHeader patient={patient} onOpenEdit={() => setEditDrawerOpen(true)} />

        <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
          <PatientDemographicsCard patient={patient} />
          <PatientMedicalSummaryCard patient={patient} />
        </div>

        <PatientProfileTabs
          visitsContent={<VisitNoteTimeline patientId={patient.id} />}
          documentsContent={<PatientDocumentsTab patientId={patient.id} />}
          billingContent={<PatientBillingTab patientId={patient.id} />}
        />
      </div>

      <Drawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit Patient (Shell)"
        description="HEALIO-039 keeps edits in a drawer to preserve chart context. Full editable form arrives in a follow-on task."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditDrawerOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled>
              Save (Coming Soon)
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-control border border-border bg-app/50 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Patient</p>
            <p className="mt-1 text-sm font-semibold text-ink">{patient.fullName}</p>
            <p className="mt-1 text-sm text-muted">
              {patient.phone}
              {patient.email ? ` • ${patient.email}` : ""}
            </p>
          </div>
          <div className="rounded-control border border-dashed border-border bg-white px-3 py-3 text-sm text-muted">
            Placeholder drawer confirms the in-context edit workflow requirement from the PRD. Future tasks will replace this with validated inputs.
          </div>
        </div>
      </Drawer>
    </>
  );
}
