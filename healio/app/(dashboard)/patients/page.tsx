"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { PatientList } from "@/components/patients/patient-list";
import { PatientSearchFilters } from "@/components/patients/patient-search-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePatientsList } from "@/hooks/usePatients";

function metricLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function PatientsPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchQuery = deferredSearchDraft.trim();
  const patientsQuery = usePatientsList(
    {
      q: searchQuery || undefined,
      page,
      pageSize,
    },
    {
      retry: false,
    },
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const list = patientsQuery.data;
  const patients = list?.items ?? [];
  const withUpcoming = patients.filter((item) => item.upcomingAppointmentAt).length;
  const attendanceRisk = patients.filter(
    (item) => item.noShowCount > 0 || item.lateCancelCount > 0,
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Patients</CardTitle>
                <Badge variant={patientsQuery.isError ? "danger" : "primary"}>
                  {patientsQuery.isError ? "Needs attention" : "Front desk ready"}
                </Badge>
              </div>
              <CardDescription>
                Search and triage patient records in a calm bento layout designed for quick handoffs.
              </CardDescription>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-control border border-border bg-app/60 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Visible</p>
                <p className="mt-1 text-lg font-semibold text-ink">{metricLabel(patients.length, "patient")}</p>
              </div>
              <div className="rounded-control border border-border bg-app/60 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Upcoming</p>
                <p className="mt-1 text-lg font-semibold text-ink">{metricLabel(withUpcoming, "visit")}</p>
              </div>
              <div className="rounded-control border border-border bg-app/60 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Attendance risk</p>
                <p className="mt-1 text-lg font-semibold text-ink">{metricLabel(attendanceRisk, "patient")}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PatientSearchFilters
            searchValue={searchDraft}
            onSearchValueChange={setSearchDraft}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            isRefreshing={patientsQuery.isFetching}
            onRefresh={() => void patientsQuery.refetch()}
            onReset={() => {
              setSearchDraft("");
              setPage(1);
              setPageSize(10);
              void patientsQuery.refetch();
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={searchQuery ? "secondary" : "primary"}
              onClick={() => {
                setSearchDraft("");
                setPage(1);
              }}
            >
              All Patients
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSearchDraft("santos")}
            >
              Quick Search: Santos
            </Button>
            <p className="text-xs text-muted">
              Use the global + button for Add Patient while keeping this list in view.
            </p>
          </div>
        </CardContent>
      </Card>

      <PatientList
        data={list}
        isLoading={patientsQuery.isLoading}
        isFetching={patientsQuery.isFetching}
        error={patientsQuery.isError ? patientsQuery.error : null}
        activeSearch={searchQuery}
        onRetry={() => void patientsQuery.refetch()}
        onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
      />
    </div>
  );
}
