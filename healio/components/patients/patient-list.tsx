"use client";

import type { PatientListResponse } from "@/schemas/patient";

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
import { PatientsApiRequestError } from "@/hooks/usePatients";

type PatientListProps = {
  data?: PatientListResponse;
  isLoading: boolean;
  isFetching: boolean;
  error: PatientsApiRequestError | null;
  activeSearch?: string;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "No recent visits";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function attendanceBadgeVariant(noShowCount: number, lateCancelCount: number) {
  if (noShowCount >= 2 || lateCancelCount >= 2) return "danger" as const;
  if (noShowCount >= 1 || lateCancelCount >= 1) return "warning" as const;
  return "success" as const;
}

function renderLoadingRows() {
  return Array.from({ length: 5 }).map((_, index) => (
    <div
      key={`patient-skeleton-${index}`}
      className="grid gap-3 rounded-control border border-border/80 bg-white p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto]"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex items-center justify-start gap-2 sm:justify-end">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-control" />
      </div>
    </div>
  ));
}

export function PatientList({
  data,
  isLoading,
  isFetching,
  error,
  activeSearch,
  onRetry,
  onPageChange,
}: PatientListProps) {
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 0;
  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Patient Directory</CardTitle>
            <CardDescription>
              Front-desk ready patient records with attendance risk indicators and quick chart access.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={error ? "danger" : isFetching ? "warning" : "success"}>
              {error ? "Error" : isFetching ? "Refreshing" : "Connected"}
            </Badge>
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0" aria-busy={isLoading || isFetching}>
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading patients" role="status" aria-live="polite">
            {renderLoadingRows()}
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-5" role="alert">
            <p className="text-sm font-semibold text-danger">Unable to load patients</p>
            <p className="mt-1 text-sm text-muted">
              {error.message}. Try refreshing. If this continues, check the API route and auth headers.
            </p>
            <div className="mt-3">
              <Button type="button" onClick={onRetry}>
                Try Again
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-card border border-border bg-app/70 p-6" role="status" aria-live="polite">
            <p className="text-sm font-semibold text-ink">
              {activeSearch ? "No matching patients yet" : "Your patient list is empty"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {activeSearch
                ? "Try a different name, phone, or email search. You can also reset filters to view all records."
                : "Use the global + button to add your first patient. Healio will keep new records organized for faster repeat visits."}
            </p>
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
          <>
            <div className="grid gap-3">
              {items.map((patient) => (
                <article
                  key={patient.id}
                  className="grid gap-3 rounded-control border border-border/80 bg-white p-4 shadow-sm transition-colors hover:border-primary/20 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{patient.fullName}</h3>
                      <Badge
                        variant={attendanceBadgeVariant(patient.noShowCount, patient.lateCancelCount)}
                      >
                        {patient.noShowCount > 0 || patient.lateCancelCount > 0
                          ? `Risk ${patient.noShowCount}/${patient.lateCancelCount}`
                          : "Reliable"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {patient.phone}
                      {patient.email ? ` • ${patient.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Created {formatDateTime(patient.createdAt)}
                    </p>
                  </div>

                  <div className="grid gap-1 text-sm">
                    <p className="text-muted">
                      <span className="font-medium text-ink">Last visit:</span>{" "}
                      {formatDateTime(patient.lastVisitAt)}
                    </p>
                    <p className="text-muted">
                      <span className="font-medium text-ink">Upcoming:</span>{" "}
                      {formatDateTime(patient.upcomingAppointmentAt)}
                    </p>
                    <p className="text-muted">
                      <span className="font-medium text-ink">No-show:</span> {patient.noShowCount} •{" "}
                      <span className="font-medium text-ink">Late cancel:</span> {patient.lateCancelCount}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button type="button" variant="ghost" size="sm">
                      Create Invoice
                    </Button>
                    <Button type="button" size="sm">
                      Open Chart
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-app/40 px-4 py-3">
              <p className="text-sm text-muted">
                Page <span className="font-medium text-ink">{page}</span>
                {" "}of{" "}
                <span className="font-medium text-ink">{Math.max(1, totalPages)}</span>
                {" "}•{" "}
                <span className="font-medium text-ink">{data?.total ?? 0}</span> patients
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={totalPages === 0 || page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
