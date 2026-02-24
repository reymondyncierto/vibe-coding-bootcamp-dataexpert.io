"use client";

import type { AppointmentStatus } from "@/schemas/appointment";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function nextStatusActions(current: AppointmentStatus) {
  const actions: Array<{ label: string; status: AppointmentStatus; variant?: "primary" | "secondary" }> = [];
  if (current === "SCHEDULED") {
    actions.push({ label: "Check In", status: "CHECKED_IN" });
    actions.push({ label: "Mark No Show", status: "NO_SHOW", variant: "secondary" });
  }
  if (current === "CHECKED_IN") {
    actions.push({ label: "Start Visit", status: "IN_PROGRESS" });
  }
  if (current === "IN_PROGRESS") {
    actions.push({ label: "Complete Visit", status: "COMPLETED" });
  }
  return actions;
}

export function AppointmentStatusActions({
  currentStatus,
  isBusy,
  cancelReason,
  onCancelReasonChange,
  onUpdateStatus,
  errorMessage,
}: {
  currentStatus: AppointmentStatus;
  isBusy?: boolean;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onUpdateStatus: (status: AppointmentStatus, cancellationReason?: string) => Promise<void> | void;
  errorMessage?: string | null;
}) {
  const isTerminal = currentStatus === "COMPLETED" || currentStatus === "CANCELLED";
  const primaryActions = nextStatusActions(currentStatus);

  return (
    <section className="space-y-3 rounded-control border border-border bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Status Workflow</h3>
        <p className="mt-1 text-sm text-muted">
          Update the visit state directly in the drawer without leaving the schedule.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {primaryActions.length === 0 ? (
          <span className="text-sm text-muted">No next-step actions for {currentStatus}.</span>
        ) : (
          primaryActions.map((action) => (
            <Button
              key={action.status}
              type="button"
              variant={action.variant ?? "primary"}
              onClick={() => void onUpdateStatus(action.status)}
              loading={isBusy}
              disabled={isBusy}
            >
              {action.label}
            </Button>
          ))
        )}
      </div>

      {!isTerminal ? (
        <div className="rounded-control border border-border bg-app p-3">
          <p className="text-sm font-medium text-ink">Cancel appointment</p>
          <p className="mt-1 text-xs text-muted">
            Cancellation requires a reason and preserves an audit trail.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={cancelReason}
              onChange={(event) => onCancelReasonChange(event.target.value)}
              placeholder="Reason for cancellation"
              name="appointmentCancellationReason"
              aria-label="Cancellation reason"
            />
            <Button
              type="button"
              variant="danger"
              disabled={isBusy || cancelReason.trim().length === 0}
              loading={isBusy}
              onClick={() => void onUpdateStatus("CANCELLED", cancelReason)}
            >
              Cancel Appointment
            </Button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
