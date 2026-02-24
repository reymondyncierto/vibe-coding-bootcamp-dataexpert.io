"use client";

import { useMemo, useState } from "react";

import type { InvoiceDetail, InvoiceStatus, InvoiceUpdatePayload } from "@/hooks/useInvoices";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InvoiceLineItemsEditor, createDefaultInvoiceLineItemDrafts, type InvoiceLineItemDraft } from "./invoice-line-items-editor";

export type InvoiceFormSubmitPayload = {
  patientId: string;
  appointmentId?: string;
  dueDateIso: string;
  currency: "PHP" | "USD";
  items: Array<{ description: string; quantity: number; unitPrice: string }>;
  taxAmount?: string;
  taxRatePercent?: number;
  notes?: string;
  status?: InvoiceStatus;
  paidAmount?: string;
  paymentMethod?: NonNullable<InvoiceUpdatePayload["paymentMethod"]> | null;
};

type Props = {
  mode: "create" | "edit";
  initialInvoice?: InvoiceDetail | null;
  defaultPatientId?: string;
  loading?: boolean;
  onSubmit: (payload: InvoiceFormSubmitPayload) => Promise<void> | void;
  onCancel: () => void;
};

type InvoiceFormState = {
  patientId: string;
  appointmentId: string;
  dueDate: string;
  currency: "PHP" | "USD";
  notes: string;
  taxMode: "none" | "amount" | "rate";
  taxAmount: string;
  taxRatePercent: string;
  status: InvoiceStatus;
  paidAmount: string;
  paymentMethod: string;
  lineItems: InvoiceLineItemDraft[];
};

function isoToDateInput(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function normalizeMoney(input: string) {
  const trimmed = input.trim();
  return trimmed || "0.00";
}

function toCents(amount: string) {
  const normalized = normalizeMoney(amount);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

function centsToMoney(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function createInitialState(
  mode: "create" | "edit",
  invoice?: InvoiceDetail | null,
  defaultPatientId?: string,
): InvoiceFormState {
  if (mode === "edit" && invoice) {
    return {
      patientId: invoice.patientId,
      appointmentId: invoice.appointmentId ?? "",
      dueDate: isoToDateInput(invoice.dueDate),
      currency: invoice.currency,
      notes: invoice.notes ?? "",
      taxMode: "amount" as const,
      taxAmount: invoice.tax,
      taxRatePercent: "",
      status: invoice.status,
      paidAmount: invoice.paidAmount,
      paymentMethod: invoice.paymentMethod ?? "",
      lineItems: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: item.unitPrice,
      })),
    };
  }

  return {
    patientId: defaultPatientId ?? "",
    appointmentId: "",
    dueDate: new Date().toISOString().slice(0, 10),
    currency: "PHP" as const,
    notes: "",
    taxMode: "none" as const,
    taxAmount: "0.00",
    taxRatePercent: "12",
    status: "DRAFT" as InvoiceStatus,
    paidAmount: "0.00",
    paymentMethod: "",
    lineItems: createDefaultInvoiceLineItemDrafts(),
  };
}

export function InvoiceForm({ mode, initialInvoice, defaultPatientId, loading = false, onSubmit, onCancel }: Props) {
  const [state, setState] = useState<InvoiceFormState>(() => createInitialState(mode, initialInvoice, defaultPatientId));
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const totalsPreview = useMemo(() => {
    const subtotalCents = state.lineItems.reduce((sum, item) => {
      const qty = Number.parseInt(item.quantity || "0", 10);
      const unit = toCents(item.unitPrice);
      if (!Number.isInteger(qty) || qty <= 0 || unit === null) return sum;
      return sum + qty * unit;
    }, 0);
    let taxCents = 0;
    if (state.taxMode === "amount") {
      taxCents = toCents(state.taxAmount) ?? 0;
    } else if (state.taxMode === "rate") {
      const rate = Number(state.taxRatePercent || "0");
      taxCents = Number.isFinite(rate) ? Math.round(subtotalCents * (rate / 100)) : 0;
    }
    return {
      subtotal: centsToMoney(Math.max(0, subtotalCents)),
      tax: centsToMoney(Math.max(0, taxCents)),
      total: centsToMoney(Math.max(0, subtotalCents + taxCents)),
    };
  }, [state.lineItems, state.taxAmount, state.taxMode, state.taxRatePercent]);

  function applyAppointmentAutofill() {
    const appointmentId = state.appointmentId.trim();
    if (!appointmentId) {
      setError("Enter an appointment ID first to use appointment autofill.");
      return;
    }
    setError(null);
    setState((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length === 1 && !prev.lineItems[0].description.trim()
          ? [
              {
                ...prev.lineItems[0],
                description: `Appointment ${appointmentId}`,
                quantity: "1",
                unitPrice: prev.lineItems[0].unitPrice === "0.00" ? "1500.00" : prev.lineItems[0].unitPrice,
              },
            ]
          : prev.lineItems,
      notes:
        prev.notes.trim() ||
        `Autofill guidance: invoice created from appointment ${appointmentId}. Review line items before sending.`,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!state.patientId.trim()) {
      setError("Patient ID is required.");
      return;
    }
    const normalizedItems = state.lineItems
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number.parseInt(item.quantity || "0", 10),
        unitPrice: normalizeMoney(item.unitPrice),
      }))
      .filter((item) => item.description.length > 0);

    if (normalizedItems.length === 0) {
      setError("At least one line item is required.");
      return;
    }
    if (normalizedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      setError("Line item quantities must be positive whole numbers.");
      return;
    }
    if (normalizedItems.some((item) => toCents(item.unitPrice) === null)) {
      setError("Line item prices must be valid money amounts (up to 2 decimals).");
      return;
    }

    const payload: InvoiceFormSubmitPayload = {
      patientId: state.patientId.trim(),
      appointmentId: state.appointmentId.trim() || undefined,
      dueDateIso: `${state.dueDate}T00:00:00.000Z`,
      currency: state.currency,
      items: normalizedItems,
      notes: state.notes.trim() || undefined,
      status: mode === "edit" ? state.status : undefined,
      paidAmount: mode === "edit" ? normalizeMoney(state.paidAmount) : undefined,
      paymentMethod: mode === "edit" ? ((state.paymentMethod || null) as any) : undefined,
    };

    if (state.taxMode === "amount") payload.taxAmount = normalizeMoney(state.taxAmount);
    if (state.taxMode === "rate") {
      const rate = Number(state.taxRatePercent || "0");
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        setError("Tax rate must be between 0 and 100.");
        return;
      }
      payload.taxRatePercent = rate;
    }

    await onSubmit(payload);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="invoice-patient-id" placeholder="Patient ID" value={state.patientId} onChange={(e) => setField("patientId", e.currentTarget.value)} />
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input name="invoice-appointment-id" placeholder="Appointment ID (optional)" value={state.appointmentId} onChange={(e) => setField("appointmentId", e.currentTarget.value)} />
            <Button type="button" variant="secondary" onClick={applyAppointmentAutofill}>Autofill</Button>
          </div>
          <p className="text-xs text-muted">Appointment autofill pre-seeds the line item and note so staff can invoice faster in-context.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Input name="invoice-due-date" type="date" value={state.dueDate} onChange={(e) => setField("dueDate", e.currentTarget.value)} />
        <Select name="invoice-currency" value={state.currency} onChange={(e) => setField("currency", e.currentTarget.value as "PHP" | "USD")}>
          <option value="PHP">PHP</option>
          <option value="USD">USD</option>
        </Select>
        <Select name="invoice-tax-mode" value={state.taxMode} onChange={(e) => setField("taxMode", e.currentTarget.value as InvoiceFormState["taxMode"])}>
          <option value="none">No Tax</option>
          <option value="amount">Tax Amount</option>
          <option value="rate">Tax Rate %</option>
        </Select>
        {state.taxMode === "amount" ? (
          <Input name="invoice-tax-amount" placeholder="Tax amount" value={state.taxAmount} onChange={(e) => setField("taxAmount", e.currentTarget.value)} />
        ) : state.taxMode === "rate" ? (
          <Input name="invoice-tax-rate" type="number" min={0} max={100} step="0.01" placeholder="Tax %" value={state.taxRatePercent} onChange={(e) => setField("taxRatePercent", e.currentTarget.value)} />
        ) : (
          <div className="rounded-control border border-border bg-app/50 px-3 py-2 text-sm text-muted">No tax</div>
        )}
      </div>

      {mode === "edit" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Select name="invoice-status" value={state.status} onChange={(e) => setField("status", e.currentTarget.value as InvoiceStatus)}>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
            <option value="REFUNDED">Refunded</option>
          </Select>
          <Input name="invoice-paid-amount" placeholder="Paid amount" value={state.paidAmount} onChange={(e) => setField("paidAmount", e.currentTarget.value)} />
          <Select name="invoice-payment-method" value={state.paymentMethod} onChange={(e) => setField("paymentMethod", e.currentTarget.value)}>
            <option value="">No payment method</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="GCASH">GCash</option>
            <option value="MAYA">Maya</option>
            <option value="STRIPE">Stripe</option>
          </Select>
        </div>
      ) : null}

      <InvoiceLineItemsEditor items={state.lineItems as InvoiceLineItemDraft[]} onChange={(items) => setField("lineItems", items)} />

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="invoice-notes">Notes</label>
        <textarea
          id="invoice-notes"
          name="invoice-notes"
          className="min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          value={state.notes}
          onChange={(e) => setField("notes", e.currentTarget.value)}
          placeholder="Optional internal billing note"
        />
      </div>

      <div className="rounded-card border border-border bg-app/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Totals Preview</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div><p className="text-xs text-muted">Subtotal</p><p className="text-sm font-semibold text-ink">{state.currency} {totalsPreview.subtotal}</p></div>
          <div><p className="text-xs text-muted">Tax</p><p className="text-sm font-semibold text-ink">{state.currency} {totalsPreview.tax}</p></div>
          <div><p className="text-xs text-muted">Total</p><p className="text-sm font-semibold text-ink">{state.currency} {totalsPreview.total}</p></div>
        </div>
      </div>

      {error ? <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{mode === "create" ? "Create Invoice" : "Save Invoice"}</Button>
      </div>
    </form>
  );
}
