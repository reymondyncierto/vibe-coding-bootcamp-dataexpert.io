"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "REFUNDED";

type InvoiceSummary = {
  id: string;
  patientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: "PHP" | "USD";
  subtotal: string;
  tax: string;
  total: string;
  paidAmount: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

type InvoiceListResponse = {
  items: InvoiceSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

class PatientBillingApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "PatientBillingApiError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      if (!headers.has("x-healio-clinic-id")) headers.set("x-healio-clinic-id", "clinic_1");
      if (!headers.has("x-healio-user-id")) headers.set("x-healio-user-id", "ui_dev_user");
      if (!headers.has("x-healio-role")) headers.set("x-healio-role", "RECEPTIONIST");
    }
  }

  const response = await fetch(input, { cache: "no-store", ...init, headers });
  let json: ApiEnvelope<T> | null = null;

  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through
  }

  if (!response.ok || !json || !json.success) {
    const error =
      json && !json.success
        ? json.error
        : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new PatientBillingApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return json.data;
}

function statusBadgeVariant(status: InvoiceStatus): "primary" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "PAID":
      return "success";
    case "SENT":
      return "primary";
    case "OVERDUE":
      return "danger";
    case "DRAFT":
      return "warning";
    case "VOID":
    case "REFUNDED":
      return "neutral";
  }
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(amount: string, currency: "PHP" | "USD") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

export function PatientBillingTab({ patientId }: { patientId: string }) {
  const invoicesQuery = useQuery<InvoiceListResponse, PatientBillingApiError>({
    queryKey: ["patientBillingInvoices", patientId],
    queryFn: () => requestJson<InvoiceListResponse>(`/api/v1/invoices?patientId=${encodeURIComponent(patientId)}`),
    retry: false,
  });

  const invoices = invoicesQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Related invoices stay in the patient chart so front desk staff can confirm balances without losing context.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={invoicesQuery.isError ? "danger" : invoicesQuery.isFetching ? "warning" : "success"}>
              {invoicesQuery.isError ? "Error" : invoicesQuery.isFetching ? "Refreshing" : "Connected"}
            </Badge>
            <Button type="button" variant="secondary" size="sm" onClick={() => void invoicesQuery.refetch()}>
              Refresh
            </Button>
            <Button type="button" size="sm" disabled title="Invoice creation UI arrives in billing dashboard tasks.">
              Create Invoice
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {invoicesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-card border border-border bg-white p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-4 w-32" />
                <Skeleton className="mt-3 h-10 w-full rounded-control" />
              </div>
            ))}
          </div>
        ) : null}

        {!invoicesQuery.isLoading && invoicesQuery.isError ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Unable to load related invoices</p>
            <p className="mt-1 text-sm text-muted">
              {invoicesQuery.error.message}. Verify the invoices list route and retry.
            </p>
            <div className="mt-3">
              <Button type="button" onClick={() => void invoicesQuery.refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : null}

        {!invoicesQuery.isLoading && !invoicesQuery.isError && invoices.length === 0 ? (
          <div className="rounded-card border border-border bg-app/60 p-4">
            <p className="text-sm font-semibold text-ink">No invoices yet</p>
            <p className="mt-1 text-sm text-muted">
              Once this patient is billed, invoice summaries will appear here with status and balance context for faster checkout conversations.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" disabled title="Invoice creation UI arrives in billing dashboard tasks.">
                Create First Invoice
              </Button>
              <Button type="button" variant="secondary" onClick={() => void invoicesQuery.refetch()}>
                Refresh List
              </Button>
            </div>
          </div>
        ) : null}

        {!invoicesQuery.isLoading && !invoicesQuery.isError && invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const total = Number(invoice.total);
              const paid = Number(invoice.paidAmount);
              const balance = Number.isFinite(total) && Number.isFinite(paid) ? Math.max(0, total - paid) : null;

              return (
                <article key={invoice.id} className="rounded-card border border-border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{invoice.invoiceNumber}</p>
                        <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        Due {formatDate(invoice.dueDate)} • Created {formatDate(invoice.createdAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">{invoice.id}</p>
                    </div>
                    <div className="min-w-[10rem] rounded-control border border-border bg-app/40 px-3 py-2 text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">Balance</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {balance === null
                          ? "Unavailable"
                          : formatCurrency(balance.toFixed(2), invoice.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Total {formatCurrency(invoice.total, invoice.currency)} • Paid {formatCurrency(invoice.paidAmount, invoice.currency)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
