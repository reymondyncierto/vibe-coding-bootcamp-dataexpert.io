"use client";

import { useEffect, useMemo, useState } from "react";

import type { VisitNoteSummary } from "@/schemas/patient";

import { useCreatePatientVisitNote } from "@/hooks/usePatientVisits";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { SoapNoteEditor, type SoapNoteEditorValue } from "./soap-note-editor";

type DrawerMode =
  | { type: "create" }
  | { type: "amend"; targetVisitId: string; appointmentId?: string };

function emptyForm(defaultAppointmentId?: string): SoapNoteEditorValue {
  return {
    appointmentId: defaultAppointmentId ?? "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };
}

export function CreateVisitNoteDrawer({
  patientId,
  open,
  mode,
  existingNotes,
  onClose,
}: {
  patientId: string;
  open: boolean;
  mode: DrawerMode;
  existingNotes: VisitNoteSummary[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<SoapNoteEditorValue>(emptyForm());
  const [amendmentToVisitId, setAmendmentToVisitId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const createVisitNote = useCreatePatientVisitNote(patientId, {
    onSuccess: () => {
      setSuccessNote(mode.type === "amend" ? "Amendment saved." : "SOAP note saved.");
      setLocalError(null);
    },
  });

  const amendableBaseNotes = useMemo(
    () => existingNotes.filter((note) => !note.amendmentToVisitId),
    [existingNotes],
  );

  useEffect(() => {
    if (!open) return;
    const defaultTarget = mode.type === "amend" ? mode.targetVisitId : "";
    setAmendmentToVisitId(defaultTarget);
    setForm(emptyForm(mode.type === "amend" ? mode.appointmentId : undefined));
    setLocalError(null);
    setSuccessNote(null);
  }, [open, mode]);

  async function handleSubmit() {
    setLocalError(null);
    setSuccessNote(null);

    if (!form.appointmentId.trim()) {
      setLocalError("Appointment ID is required.");
      return;
    }
    if (!form.subjective.trim()) {
      setLocalError("Subjective notes are required.");
      return;
    }
    if (mode.type === "amend" && !amendmentToVisitId) {
      setLocalError("Select the visit note to amend.");
      return;
    }

    try {
      await createVisitNote.mutateAsync({
        appointmentId: form.appointmentId.trim(),
        subjective: form.subjective.trim(),
        ...(form.objective.trim() ? { objective: form.objective.trim() } : {}),
        ...(form.assessment.trim() ? { assessment: form.assessment.trim() } : {}),
        ...(form.plan.trim() ? { plan: form.plan.trim() } : {}),
        ...(mode.type === "amend" ? { amendmentToVisitId } : {}),
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to save visit note.");
      return;
    }
  }

  const targetLabel =
    mode.type === "amend"
      ? amendableBaseNotes.find((note) => note.id === amendmentToVisitId)?.id ?? amendmentToVisitId
      : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode.type === "amend" ? "Add SOAP Amendment" : "Create SOAP Note"}
      description={
        mode.type === "amend"
          ? "Append-only amendment flow preserves note history. The original note remains unchanged."
          : "Create a SOAP note without leaving the patient chart."
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} loading={createVisitNote.isPending}>
            {mode.type === "amend" ? "Save Amendment" : "Save SOAP Note"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {mode.type === "amend" ? (
          <label className="grid gap-1 text-sm">
            <span className="healio-label">Amend Existing Visit *</span>
            <Select
              name="amendmentToVisitId"
              value={amendmentToVisitId}
              onChange={(event) => setAmendmentToVisitId(event.target.value)}
              disabled={createVisitNote.isPending}
            >
              <option value="">Select a base visit note</option>
              {amendableBaseNotes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.id} • {new Date(note.createdAt).toLocaleString()}
                </option>
              ))}
            </Select>
            <span className="text-xs text-muted">
              {targetLabel
                ? `Amending ${targetLabel}`
                : "Select the original visit note that this amendment appends to."}
            </span>
          </label>
        ) : null}

        <SoapNoteEditor
          value={form}
          onChange={setForm}
          disabled={createVisitNote.isPending}
        />

        {successNote ? (
          <div className="rounded-control border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
            {successNote}
          </div>
        ) : null}

        {localError ? (
          <div className="rounded-control border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {localError}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
