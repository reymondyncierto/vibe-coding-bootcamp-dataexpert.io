"use client";

import { Button } from "@/components/ui/button";

export function AppointmentQuickActions({
  notes,
  onNotesChange,
  onSaveNotes,
  onDelete,
  isSaving,
  isDeleting,
  message,
}: {
  notes: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  isSaving?: boolean;
  isDeleting?: boolean;
  message?: string | null;
}) {
  return (
    <section className="space-y-3 rounded-control border border-border bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Quick Actions</h3>
        <p className="mt-1 text-sm text-muted">
          Update notes or remove a mistaken booking without navigating away.
        </p>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">Notes</span>
        <textarea
          className="min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          name="appointmentNotes"
          placeholder="Add front desk notes, special instructions, or follow-up context..."
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void onSaveNotes()} loading={isSaving}>
          Save Notes
        </Button>
        <Button type="button" variant="danger" onClick={() => void onDelete()} loading={isDeleting}>
          Delete Appointment
        </Button>
      </div>

      {message ? (
        <div className="rounded-control border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}
    </section>
  );
}
