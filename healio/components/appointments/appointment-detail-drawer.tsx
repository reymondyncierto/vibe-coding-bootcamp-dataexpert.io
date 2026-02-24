"use client";

import { useEffect, useMemo, useState } from "react";

import type { AppointmentStatus } from "@/schemas/appointment";

import {
  ApiRequestError,
  useAppointmentDetail,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentQuickActions } from "./appointment-quick-actions";
import { AppointmentStatusActions } from "./appointment-status-actions";

function pretty(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimeRange(startTime: string, endTime: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startTime))} - ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endTime))}`;
}

function statusVariant(status: AppointmentStatus) {
  switch (status) {
    case "CHECKED_IN":
    case "IN_PROGRESS":
      return "primary" as const;
    case "COMPLETED":
      return "success" as const;
    case "NO_SHOW":
      return "warning" as const;
    case "CANCELLED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function AppointmentDetailDrawer({
  appointmentId,
  appointmentDate,
  onClose,
}: {
  appointmentId: string | null;
  appointmentDate?: string;
  onClose: () => void;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const [notes, setNotes] = useState("");
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const detailQuery = useAppointmentDetail(appointmentId, { retry: false });
  const updateMutation = useUpdateAppointment();
  const deleteMutation = useDeleteAppointment();

  useEffect(() => {
    if (!detailQuery.data) return;
    setCancelReason(detailQuery.data.cancellationReason ?? "");
    setNotes(detailQuery.data.notes ?? "");
    setUiError(null);
    setUiMessage(null);
  }, [detailQuery.data]);

  const detail = detailQuery.data;

  const isBusy = updateMutation.isPending || deleteMutation.isPending;
  const detailErrorMessage = useMemo(() => {
    if (!detailQuery.error) return null;
    if (detailQuery.error instanceof ApiRequestError) return detailQuery.error.message;
    return "Unable to load appointment.";
  }, [detailQuery.error]);

  async function handleUpdateStatus(status: AppointmentStatus, cancellationReason?: string) {
    if (!appointmentId) return;
    setUiError(null);
    setUiMessage(null);
    try {
      await updateMutation.mutateAsync({
        id: appointmentId,
        patch:
          status === "CANCELLED"
            ? { status, cancellationReason: (cancellationReason ?? cancelReason).trim() }
            : { status },
      });
      setUiMessage(`Status updated to ${status}.`);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Unable to update appointment.");
    }
  }

  async function handleSaveNotes() {
    if (!appointmentId) return;
    setUiError(null);
    setUiMessage(null);
    try {
      await updateMutation.mutateAsync({
        id: appointmentId,
        patch: { notes },
      });
      setUiMessage("Notes saved.");
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Unable to save notes.");
    }
  }

  async function handleDelete() {
    if (!appointmentId) return;
    setUiError(null);
    setUiMessage(null);
    try {
      await deleteMutation.mutateAsync({ id: appointmentId, date: appointmentDate });
      setUiMessage("Appointment deleted.");
      onClose();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Unable to delete appointment.");
    }
  }

  return (
    <Drawer
      open={Boolean(appointmentId)}
      onClose={onClose}
      title={detail ? pretty(detail.patientId) : "Appointment details"}
      description="Slide-out detail workflow for status updates, notes, and cleanup actions."
      footer={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {detail ? (
            <Badge variant={statusVariant(detail.status)} className="px-3 py-2 text-xs">
              {pretty(detail.status)}
            </Badge>
          ) : null}
        </div>
      }
    >
      {detailQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {detailQuery.isError ? (
        <div className="rounded-control border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">Unable to load appointment</p>
          <p className="mt-1 text-sm text-muted">{detailErrorMessage}</p>
        </div>
      ) : null}

      {detail ? (
        <div className="space-y-4">
          <section className="rounded-control border border-border bg-app p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-ink">{pretty(detail.patientId)}</p>
                <p className="mt-1 text-sm text-muted">{pretty(detail.serviceId)}</p>
              </div>
              <Badge variant={statusVariant(detail.status)}>{pretty(detail.status)}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                <span className="font-medium text-ink">Time:</span>{" "}
                <span className="text-muted">{formatTimeRange(detail.startTime, detail.endTime)}</span>
              </p>
              <p>
                <span className="font-medium text-ink">Staff:</span>{" "}
                <span className="text-muted">{pretty(detail.staffId)}</span>
              </p>
              <p>
                <span className="font-medium text-ink">Source:</span>{" "}
                <span className="text-muted">{pretty(detail.source)}</span>
              </p>
              {detail.cancellationReason ? (
                <p>
                  <span className="font-medium text-ink">Cancellation reason:</span>{" "}
                  <span className="text-muted">{detail.cancellationReason}</span>
                </p>
              ) : null}
            </div>
          </section>

          <AppointmentStatusActions
            currentStatus={detail.status}
            cancelReason={cancelReason}
            onCancelReasonChange={setCancelReason}
            onUpdateStatus={handleUpdateStatus}
            isBusy={isBusy}
            errorMessage={uiError}
          />

          <AppointmentQuickActions
            notes={notes}
            onNotesChange={setNotes}
            onSaveNotes={handleSaveNotes}
            onDelete={handleDelete}
            isSaving={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
            message={uiMessage}
          />
        </div>
      ) : null}
    </Drawer>
  );
}
