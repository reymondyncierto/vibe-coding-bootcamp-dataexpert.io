"use client";

import type { InvoiceSummary, InvoiceStatus } from "@/hooks/useInvoices";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatMoney(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

type Props = {
  invoices: InvoiceSummary[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  search: string;
  statusFilter: InvoiceStatus | "ALL";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: InvoiceStatus | "ALL") => void;
  onRefresh: () => void;
  onCreateInvoice?: () => void;
  onEditInvoice?: (invoiceId: string) => void;
};

export function InvoiceList(props: Props) {
  const filtered = props.invoices.filter((invoice) => {
    const term = props.search.trim().toLowerCase();
    if (!term) return true;
    return (
      invoice.invoiceNumber.toLowerCase().includes(term) ||
      invoice.id.toLowerCase().includes(term) ||
      invoice.patientId.toLowerCase().includes(term)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Filterable invoice list for front desk billing follow-up and same-day collection workflows.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              name="invoice-search"
              aria-label="Search invoices"
              placeholder="Search invoice #, patient ID"
              value={props.search}
              onChange={(event) => props.onSearchChange(event.currentTarget.value)}
              className="w-56"
            />
            <Select
              name="invoice-status"
              aria-label="Filter invoices by status"
              value={props.statusFilter}
              onChange={(event) => props.onStatusChange(event.currentTarget.value as InvoiceStatus | "ALL")}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="VOID">Void</option>
              <option value="REFUNDED">Refunded</option>
            </Select>
            <Button type="button" variant="secondary" onClick={props.onRefresh}>
              Refresh
            </Button>
            {props.onCreateInvoice ? (
              <Button type="button" onClick={props.onCreateInvoice}>
                New Invoice
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {props.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-card border border-border bg-white p-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-2 h-4 w-60" />
                <Skeleton className="mt-3 h-10 w-full rounded-control" />
              </div>
            ))}
          </div>
        ) : null}

        {!props.isLoading && props.isError ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Unable to load invoices</p>
            <p className="mt-1 text-sm text-muted">{props.errorMessage || "Please retry."}</p>
            <div className="mt-3">
              <Button type="button" onClick={props.onRefresh}>Try Again</Button>
            </div>
          </div>
        ) : null}

        {!props.isLoading && !props.isError && props.invoices.length === 0 ? (
          <div className="rounded-card border border-border bg-app/60 p-4">
            <p className="text-sm font-semibold text-ink">No invoices yet</p>
            <p className="mt-1 text-sm text-muted">
              Your revenue dashboard will populate after the first invoice is created. Use the global + flow or patient billing tab to start billing.
            </p>
          </div>
        ) : null}

        {!props.isLoading && !props.isError && props.invoices.length > 0 && filtered.length === 0 ? (
          <div className="rounded-card border border-border bg-app/60 p-4">
            <p className="text-sm font-semibold text-ink">No invoices match this filter</p>
            <p className="mt-1 text-sm text-muted">
              Adjust the search text or status filter to see matching invoice records.
            </p>
          </div>
        ) : null}

        {!props.isLoading && !props.isError && filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((invoice) => {
              const total = Number(invoice.total) || 0;
              const paid = Number(invoice.paidAmount) || 0;
              const balance = Math.max(0, total - paid);
              return (
                <article key={invoice.id} className="rounded-card border border-border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{invoice.invoiceNumber}</p>
                        <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                        <Badge variant="neutral">Patient {invoice.patientId}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        Due {formatDate(invoice.dueDate)} • Created {formatDate(invoice.createdAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">{invoice.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{formatMoney(invoice.total, invoice.currency)}</p>
                      <p className="mt-1 text-xs text-muted">
                        Paid {formatMoney(invoice.paidAmount, invoice.currency)} • Balance {formatMoney(balance.toFixed(2), invoice.currency)}
                      </p>
                      {props.onEditInvoice ? (
                        <div className="mt-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => props.onEditInvoice?.(invoice.id)}>
                            Edit
                          </Button>
                        </div>
                      ) : null}
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
