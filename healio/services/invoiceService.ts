import crypto from "node:crypto";

import type {
  InvoiceCreateInput,
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceLineItemInput,
  InvoiceStatus,
  InvoiceSummary,
  InvoiceUpdateInput,
  InvoicesListQuery,
} from "@/schemas/invoice";
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoicesListQuerySchema,
} from "@/schemas/invoice";
import { centsToMoney, moneyToCents } from "@/lib/utils";

export type InvoiceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export type InvoiceTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  subtotal: string;
  tax: string;
  total: string;
};

type InvoiceRecord = InvoiceDetail;

type InvoiceNumberSequenceStore = Map<string, number>;

function getInvoiceStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioInvoiceStore?: InvoiceRecord[];
  };
  if (!globalScope.__healioInvoiceStore) {
    globalScope.__healioInvoiceStore = [];
  }
  return globalScope.__healioInvoiceStore;
}

function getInvoiceSequenceStore(): InvoiceNumberSequenceStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioInvoiceSequenceStore?: InvoiceNumberSequenceStore;
  };
  if (!globalScope.__healioInvoiceSequenceStore) {
    globalScope.__healioInvoiceSequenceStore = new Map();
  }
  return globalScope.__healioInvoiceSequenceStore;
}

function toInvoiceSummary(invoice: InvoiceRecord): InvoiceSummary {
  return {
    id: invoice.id,
    clinicId: invoice.clinicId,
    patientId: invoice.patientId,
    appointmentId: invoice.appointmentId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    paidAmount: invoice.paidAmount,
    paymentMethod: invoice.paymentMethod,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    sentAt: invoice.sentAt,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

function buildInvoiceItems(inputItems: InvoiceLineItemInput[], nowIso: string): InvoiceLineItem[] {
  return inputItems.map((item) => {
    const quantity = item.quantity;
    const unitPriceCents = moneyToCents(item.unitPrice);
    const totalCents = quantity * unitPriceCents;
    return {
      id: `invitem_${crypto.randomUUID()}`,
      description: item.description.trim(),
      quantity,
      unitPrice: centsToMoney(unitPriceCents),
      total: centsToMoney(totalCents),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

export function calculateInvoiceTotals(input: {
  items: Array<Pick<InvoiceLineItemInput, "quantity" | "unitPrice">>;
  taxAmount?: string;
  taxRatePercent?: number;
}): InvoiceTotals {
  if (!input.items.length) {
    throw new Error("At least one invoice item is required to calculate totals.");
  }

  const subtotalCents = input.items.reduce((sum, item) => {
    return sum + item.quantity * moneyToCents(item.unitPrice);
  }, 0);

  let taxCents = 0;
  if (input.taxAmount !== undefined) {
    taxCents = moneyToCents(input.taxAmount);
  } else if (input.taxRatePercent !== undefined) {
    taxCents = Math.round(subtotalCents * (input.taxRatePercent / 100));
  }

  const totalCents = subtotalCents + taxCents;
  return {
    subtotalCents,
    taxCents,
    totalCents,
    subtotal: centsToMoney(subtotalCents),
    tax: centsToMoney(taxCents),
    total: centsToMoney(totalCents),
  };
}

export function generateInvoiceNumberForClinic(clinicId: string, now = new Date()): string {
  const year = now.getUTCFullYear();
  const sequenceKey = `${clinicId}:${year}`;
  const sequenceStore = getInvoiceSequenceStore();
  const next = (sequenceStore.get(sequenceKey) ?? 0) + 1;
  sequenceStore.set(sequenceKey, next);
  return `INV-${year}-${String(next).padStart(5, "0")}`;
}

function validateStatusTransition(current: InvoiceStatus, next: InvoiceStatus): InvoiceServiceResult<null> {
  if (current === next) return { ok: true, data: null };

  if (current === "VOID") {
    return {
      ok: false,
      code: "INVALID_STATUS_TRANSITION",
      message: "Void invoices cannot transition to another status.",
      status: 400,
    };
  }

  if (current === "PAID" && next === "DRAFT") {
    return {
      ok: false,
      code: "INVALID_STATUS_TRANSITION",
      message: "Paid invoices cannot move back to draft.",
      status: 400,
    };
  }

  return { ok: true, data: null };
}

function ensureAppointmentNotDuplicate(clinicId: string, appointmentId?: string, excludingInvoiceId?: string) {
  if (!appointmentId) return true;
  return !getInvoiceStore().some(
    (invoice) =>
      invoice.clinicId === clinicId &&
      invoice.appointmentId === appointmentId &&
      invoice.id !== excludingInvoiceId &&
      invoice.deletedAt === null,
  );
}

export function createInvoiceForClinic(input: InvoiceCreateInput): InvoiceServiceResult<InvoiceDetail> {
  const parsed = invoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INVOICE_CREATE_PAYLOAD",
      message: "Invalid invoice payload.",
      status: 400,
      details: parsed.error.flatten(),
    };
  }

  if (!ensureAppointmentNotDuplicate(parsed.data.clinicId, parsed.data.appointmentId)) {
    return {
      ok: false,
      code: "APPOINTMENT_ALREADY_INVOICED",
      message: "Appointment already has an invoice.",
      status: 409,
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const items = buildInvoiceItems(parsed.data.items, nowIso);
  const totals = calculateInvoiceTotals({
    items: parsed.data.items,
    taxAmount: parsed.data.taxAmount,
    taxRatePercent: parsed.data.taxRatePercent,
  });

  const invoice: InvoiceRecord = {
    id: `inv_${crypto.randomUUID()}`,
    clinicId: parsed.data.clinicId,
    patientId: parsed.data.patientId,
    appointmentId: parsed.data.appointmentId ?? null,
    invoiceNumber: generateInvoiceNumberForClinic(parsed.data.clinicId, now),
    status: "DRAFT",
    currency: parsed.data.currency,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paidAmount: "0.00",
    paymentMethod: null,
    dueDate: parsed.data.dueDate,
    paidAt: null,
    sentAt: null,
    notes: parsed.data.notes ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
    items,
    stripePaymentIntentId: null,
    stripeCheckoutUrl: null,
    deletedAt: null,
  };

  getInvoiceStore().push(invoice);
  return { ok: true, data: structuredClone(invoice) };
}

export function listInvoicesForClinic(input: {
  clinicId: string;
  query?: Partial<InvoicesListQuery>;
}): InvoiceServiceResult<{ items: InvoiceSummary[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const parsedQuery = invoicesListQuerySchema.safeParse(input.query ?? {});
  if (!parsedQuery.success) {
    return {
      ok: false,
      code: "INVALID_INVOICE_LIST_QUERY",
      message: "Invalid invoice list query.",
      status: 400,
      details: parsedQuery.error.flatten(),
    };
  }

  const { page, pageSize, patientId, status } = parsedQuery.data;
  const filtered = getInvoiceStore()
    .filter((invoice) => invoice.clinicId === input.clinicId && invoice.deletedAt === null)
    .filter((invoice) => (patientId ? invoice.patientId === patientId : true))
    .filter((invoice) => (status ? invoice.status === status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize).map(toInvoiceSummary);

  return {
    ok: true,
    data: {
      items: structuredClone(pageItems),
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export function getInvoiceByIdForClinic(clinicId: string, invoiceId: string): InvoiceDetail | null {
  const found = getInvoiceStore().find(
    (invoice) => invoice.id === invoiceId && invoice.clinicId === clinicId && invoice.deletedAt === null,
  );
  return found ? structuredClone(found) : null;
}

export function updateInvoiceForClinic(input: {
  clinicId: string;
  invoiceId: string;
  patch: InvoiceUpdateInput;
}): InvoiceServiceResult<InvoiceDetail> {
  const parsedPatch = invoiceUpdateSchema.safeParse(input.patch);
  if (!parsedPatch.success) {
    return {
      ok: false,
      code: "INVALID_INVOICE_UPDATE_PAYLOAD",
      message: "Invalid invoice update payload.",
      status: 400,
      details: parsedPatch.error.flatten(),
    };
  }

  const store = getInvoiceStore();
  const index = store.findIndex(
    (invoice) => invoice.id === input.invoiceId && invoice.clinicId === input.clinicId && invoice.deletedAt === null,
  );
  if (index === -1) {
    return { ok: false, code: "INVOICE_NOT_FOUND", message: "Invoice not found.", status: 404 };
  }

  const current = store[index];
  const patch = parsedPatch.data;

  if (patch.status) {
    const statusCheck = validateStatusTransition(current.status, patch.status);
    if (!statusCheck.ok) return statusCheck;
  }

  const nextItems = patch.items ? buildInvoiceItems(patch.items, current.createdAt) : current.items;
  const totals = patch.items || patch.taxAmount !== undefined || patch.taxRatePercent !== undefined
    ? calculateInvoiceTotals({
        items: (patch.items ?? current.items).map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxAmount: patch.taxAmount ?? (patch.taxRatePercent === undefined ? current.tax : undefined),
        taxRatePercent: patch.taxRatePercent,
      })
    : null;

  const nextPaidAmount = patch.paidAmount ?? current.paidAmount;
  const nextStatus = patch.status ?? current.status;
  if (moneyToCents(nextPaidAmount) > moneyToCents(totals?.total ?? current.total)) {
    return {
      ok: false,
      code: "PAID_AMOUNT_EXCEEDS_TOTAL",
      message: "Paid amount cannot exceed invoice total.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const updated: InvoiceRecord = {
    ...current,
    dueDate: patch.dueDate ?? current.dueDate,
    currency: patch.currency ?? current.currency,
    items: nextItems,
    subtotal: totals?.subtotal ?? current.subtotal,
    tax: totals?.tax ?? current.tax,
    total: totals?.total ?? current.total,
    notes: patch.notes !== undefined ? patch.notes ?? null : current.notes,
    status: nextStatus,
    paidAmount: nextPaidAmount,
    paymentMethod: patch.paymentMethod !== undefined ? patch.paymentMethod ?? null : current.paymentMethod,
    paidAt:
      nextStatus === "PAID"
        ? current.paidAt ?? nowIso
        : nextStatus === "DRAFT"
          ? null
          : current.paidAt,
    sentAt:
      nextStatus === "SENT"
        ? current.sentAt ?? nowIso
        : current.sentAt,
    updatedAt: nowIso,
  };

  store[index] = updated;
  return { ok: true, data: structuredClone(updated) };
}

export function setInvoiceStripeCheckoutLinkForClinic(input: {
  clinicId: string;
  invoiceId: string;
  stripeCheckoutUrl: string;
  stripePaymentIntentId?: string | null;
}): InvoiceServiceResult<InvoiceDetail> {
  const store = getInvoiceStore();
  const index = store.findIndex(
    (invoice) => invoice.id === input.invoiceId && invoice.clinicId === input.clinicId && invoice.deletedAt === null,
  );
  if (index === -1) {
    return { ok: false, code: "INVOICE_NOT_FOUND", message: "Invoice not found.", status: 404 };
  }

  const current = store[index];
  const nowIso = new Date().toISOString();
  const updated: InvoiceRecord = {
    ...current,
    stripeCheckoutUrl: input.stripeCheckoutUrl,
    stripePaymentIntentId:
      input.stripePaymentIntentId !== undefined ? input.stripePaymentIntentId : current.stripePaymentIntentId,
    status: current.status === "DRAFT" ? "SENT" : current.status,
    sentAt: current.sentAt ?? nowIso,
    updatedAt: nowIso,
  };

  store[index] = updated;
  return { ok: true, data: structuredClone(updated) };
}

export function resetInvoiceStoresForTests() {
  getInvoiceStore().length = 0;
  getInvoiceSequenceStore().clear();
}
