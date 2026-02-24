"use client";

import { useMemo, useState } from "react";

import type { VisitNoteSummary } from "@/schemas/patient";

import { usePatientVisitNotes } from "@/hooks/usePatientVisits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateVisitNoteDrawer } from "./create-visit-note-drawer";

type DrawerMode =
  | { type: "create" }
  | { type: "amend"; targetVisitId: string; appointmentId?: string };

function formatDateTime(value: string) {
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

function NoteBody({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-control border border-border/80 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
        {value?.trim() || "Not provided"}
      </p>
    </div>
  );
}

export function VisitNoteTimeline({ patientId }: { patientId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>({ type: "create" });

  const visitsQuery = usePatientVisitNotes(patientId, { retry: false });
  const notes = visitsQuery.data ?? [];

  const grouped = useMemo(() => {
    const amendmentsByTarget = new Map<string, VisitNoteSummary[]>();
    const baseNotes: VisitNoteSummary[] = [];
    for (const note of notes) {
      if (note.amendmentToVisitId) {
        const arr = amendmentsByTarget.get(note.amendmentToVisitId) ?? [];
        arr.push(note);
        amendmentsByTarget.set(note.amendmentToVisitId, arr);
      } else {
        baseNotes.push(note);
      }
    }
    return { baseNotes, amendmentsByTarget };
  }, [notes]);

  function openCreate() {
    setDrawerMode({ type: "create" });
    setDrawerOpen(true);
  }

  function openAmend(note: VisitNoteSummary) {
    setDrawerMode({
      type: "amend",
      targetVisitId: note.id,
      appointmentId: note.appointmentId,
    });
    setDrawerOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Visit Notes Timeline</CardTitle>
              <CardDescription>
                SOAP notes and append-only amendments stay visible in chart context.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={visitsQuery.isError ? "danger" : visitsQuery.isFetching ? "warning" : "success"}>
                {visitsQuery.isError ? "Error" : visitsQuery.isFetching ? "Refreshing" : "Connected"}
              </Badge>
              <Button type="button" variant="secondary" size="sm" onClick={() => void visitsQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreate}>
                New SOAP Note
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {visitsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-card border border-border bg-white p-4">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="mt-3 h-16 w-full rounded-control" />
                  <Skeleton className="mt-2 h-16 w-full rounded-control" />
                </div>
              ))}
            </div>
          ) : null}

          {!visitsQuery.isLoading && visitsQuery.isError ? (
            <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
              <p className="text-sm font-semibold text-danger">Unable to load visit notes</p>
              <p className="mt-1 text-sm text-muted">
                {visitsQuery.error.message}. Retry or verify the patient visits API route.
              </p>
              <div className="mt-3">
                <Button type="button" onClick={() => void visitsQuery.refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : null}

          {!visitsQuery.isLoading && !visitsQuery.isError && notes.length === 0 ? (
            <div className="rounded-card border border-border bg-app/60 p-4">
              <p className="text-sm font-semibold text-ink">No visit notes yet</p>
              <p className="mt-1 text-sm text-muted">
                Start with a SOAP note in the drawer. Amendments are appended later to preserve auditability.
              </p>
              <div className="mt-3">
                <Button type="button" onClick={openCreate}>
                  Create First SOAP Note
                </Button>
              </div>
            </div>
          ) : null}

          {!visitsQuery.isLoading && !visitsQuery.isError && grouped.baseNotes.length > 0 ? (
            <div className="space-y-4">
              {grouped.baseNotes.map((note) => {
                const amendments = (grouped.amendmentsByTarget.get(note.id) ?? []).sort((a, b) =>
                  a.createdAt.localeCompare(b.createdAt),
                );

                return (
                  <article key={note.id} className="rounded-card border border-border bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-ink">Visit Note</h4>
                          <Badge variant="primary">{note.id}</Badge>
                          <Badge variant="neutral">Appointment {note.appointmentId}</Badge>
                          {amendments.length > 0 ? (
                            <Badge variant="warning">
                              {amendments.length} amendment{amendments.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted">{formatDateTime(note.createdAt)}</p>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => openAmend(note)}>
                        Amend Note
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <NoteBody label="Subjective" value={note.subjective} />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <NoteBody label="Objective" value={note.objective} />
                        <NoteBody label="Assessment" value={note.assessment} />
                        <NoteBody label="Plan" value={note.plan} />
                      </div>
                    </div>

                    {amendments.length > 0 ? (
                      <div className="mt-4 rounded-control border border-warning/20 bg-warning/5 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                            Amendments (Append-Only)
                          </p>
                        </div>
                        <div className="space-y-2">
                          {amendments.map((amendment) => (
                            <div key={amendment.id} className="rounded-control border border-border bg-white p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="warning">{amendment.id}</Badge>
                                <span className="text-xs text-muted">{formatDateTime(amendment.createdAt)}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                                {amendment.subjective}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CreateVisitNoteDrawer
        patientId={patientId}
        open={drawerOpen}
        mode={drawerMode}
        existingNotes={notes}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
