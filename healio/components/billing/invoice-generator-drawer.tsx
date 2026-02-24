"use client";

import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast-provider";
import {
  useCreateInvoice,
  useInvoiceDetail,
  useUpdateInvoice,
  type InvoiceDetail,
  type InvoiceUpdatePayload,
} from "@/hooks/useInvoices";
import { InvoiceForm, type InvoiceFormSubmitPayload } from "./invoice-form";

export type InvoiceGeneratorDrawerMode =
  | { type: "create"; defaultPatientId?: string }
  | { type: "edit"; invoiceId: string };

type Props = {
  open: boolean;
  mode: InvoiceGeneratorDrawerMode;
  onClose: () => void;
};

export function InvoiceGeneratorDrawer({ open, mode, onClose }: Props) {
  const { pushToast } = useToast();
  const detailQuery = useInvoiceDetail(mode.type === "edit" ? mode.invoiceId : null, { retry: false });

  const createMutation = useCreateInvoice({
    onSuccess: (data) => {
      pushToast({ title: "Invoice created", description: `${data.invoiceNumber} is ready for review and send flow.`, variant: "success" });
      onClose();
    },
    onError: (error) => {
      pushToast({ title: "Create invoice failed", description: error.message, variant: "error" });
    },
  });

  const updateMutation = useUpdateInvoice(mode.type === "edit" ? mode.invoiceId : null, {
    onSuccess: (data) => {
      pushToast({ title: "Invoice updated", description: `${data.invoiceNumber} changes saved.`, variant: "success" });
      onClose();
    },
    onError: (error) => {
      pushToast({ title: "Update invoice failed", description: error.message, variant: "error" });
    },
  });

  async function handleSubmit(payload: InvoiceFormSubmitPayload) {
    if (mode.type === "create") {
      await createMutation.mutateAsync({
        patientId: payload.patientId,
        appointmentId: payload.appointmentId,
        dueDate: payload.dueDateIso,
        currency: payload.currency,
        items: payload.items,
        ...(payload.taxAmount ? { taxAmount: payload.taxAmount } : {}),
        ...(payload.taxRatePercent !== undefined ? { taxRatePercent: payload.taxRatePercent } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      });
      return;
    }

    const patch: InvoiceUpdatePayload = {
      dueDate: payload.dueDateIso,
      currency: payload.currency,
      items: payload.items,
      ...(payload.taxAmount ? { taxAmount: payload.taxAmount } : {}),
      ...(payload.taxRatePercent !== undefined ? { taxRatePercent: payload.taxRatePercent } : {}),
      notes: payload.notes,
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.paidAmount ? { paidAmount: payload.paidAmount } : {}),
      ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod } : {}),
    };
    await updateMutation.mutateAsync(patch);
  }

  const initialInvoice: InvoiceDetail | null = mode.type === "edit" ? detailQuery.data ?? null : null;
  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    (mode.type === "edit" && detailQuery.isLoading);

  const title = mode.type === "create" ? "Create Invoice" : "Edit Invoice";
  const description =
    mode.type === "create"
      ? "Stripe-style in-context invoice generation keeps staff on the billing dashboard while drafting charges."
      : "Update invoice line items, status, and payment fields without leaving the billing workspace.";

  return (
    <Drawer open={open} onClose={onClose} title={title} description={description}>
      {mode.type === "edit" && detailQuery.isLoading ? (
        <div className="rounded-card border border-border bg-app/50 p-4 text-sm text-muted">Loading invoice details…</div>
      ) : mode.type === "edit" && detailQuery.isError ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">Unable to load invoice</p>
          <p className="mt-1 text-sm text-muted">{detailQuery.error.message}</p>
        </div>
      ) : (
        <InvoiceForm
          key={mode.type === "create" ? `create:${mode.defaultPatientId ?? ""}` : `edit:${mode.invoiceId}:${initialInvoice?.updatedAt ?? "pending"}`}
          mode={mode.type}
          defaultPatientId={mode.type === "create" ? mode.defaultPatientId : undefined}
          initialInvoice={initialInvoice}
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      )}
    </Drawer>
  );
}
