"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import type { InvoiceDetail } from "@/schemas/invoice";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  invoiceId: string;
};

type PayLinkResponse = {
  sessionId: string;
  provider: "stripe" | "fallback" | string;
  checkoutUrl: string;
};

function getDevHeaders() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return {};
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_public_payment_demo",
    "x-healio-role": "OWNER",
  };
}

function statusVariant(status: InvoiceDetail["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "OVERDUE":
      return "danger" as const;
    case "SENT":
      return "primary" as const;
    case "VOID":
    case "REFUNDED":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function formatMoney(currency: string, amount: string) {
  const value = Number(amount || 0);
  const code = currency === "USD" ? "USD" : "PHP";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export function PublicInvoicePaymentCard({ invoiceId }: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLinkLoading, setPayLinkLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/invoices/${invoiceId}`, {
          headers: {
            ...getDevHeaders(),
          },
          cache: "no-store",
        });
        const json = (await response.json()) as ApiSuccess<InvoiceDetail> | ApiFailure;
        if (!response.ok || !json.success) {
          const message = !json.success ? json.error.message : "Unable to load invoice.";
          if (!cancelled) setError(message);
          return;
        }
        if (!cancelled) setInvoice(json.data);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load invoice.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const balance = useMemo(() => {
    if (!invoice) return null;
    const total = Number(invoice.total || 0);
    const paid = Number(invoice.paidAmount || 0);
    return Math.max(0, total - paid).toFixed(2);
  }, [invoice]);

  async function handleGeneratePayLink() {
    if (!invoice) return;
    setPayLinkLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/invoices/${invoice.id}/pay-link`, {
        method: "POST",
        headers: {
          ...getDevHeaders(),
        },
      });
      const json = (await response.json()) as ApiSuccess<PayLinkResponse> | ApiFailure;
      if (!response.ok || !json.success) {
        const message = !json.success ? json.error.message : "Unable to generate payment link.";
        setError(message);
        return;
      }
      setInvoice((prev) => (prev ? { ...prev, stripeCheckoutUrl: json.data.checkoutUrl } : prev));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate payment link.");
    } finally {
      setPayLinkLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-danger/20 bg-white">
          <CardHeader>
            <CardTitle>Invoice unavailable</CardTitle>
            <CardDescription>
              We couldn&apos;t load this payment page. Check the invoice link or contact the clinic front desk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {error ?? "Invoice not found."}
            </p>
            <p className="text-sm text-muted">Reference invoice ID: {invoiceId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === "PAID" || Number(invoice.paidAmount || 0) >= Number(invoice.total || 0);
  const isClosed = ["VOID", "REFUNDED"].includes(invoice.status);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]" aria-label="Invoice payment details">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Secure Payment</p>
                <CardTitle className="mt-1">{invoice.invoiceNumber}</CardTitle>
                <CardDescription>
                  Review the invoice details below, then continue to secure checkout when ready.
                </CardDescription>
              </div>
              <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-border bg-app/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted">Patient</p>
                <p className="mt-1 text-sm font-semibold text-ink">{invoice.patientId}</p>
                <p className="mt-1 text-xs text-muted">Invoice ID {invoice.id}</p>
              </div>
              <div className="rounded-card border border-border bg-app/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted">Due date</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatDate(invoice.dueDate)}</p>
                <p className="mt-1 text-xs text-muted">Created {formatDate(invoice.createdAt)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-card border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-app/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <span>Item</span>
                <span>Qty</span>
                <span className="text-right">Amount</span>
              </div>
              <ul className="divide-y divide-border bg-white">
                {invoice.items.map((item) => (
                  <li key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink">{item.description}</p>
                      <p className="text-xs text-muted">{formatMoney(invoice.currency, item.unitPrice)} each</p>
                    </div>
                    <span className="text-muted">x{item.quantity}</span>
                    <span className="text-right font-semibold text-ink">{formatMoney(invoice.currency, item.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {invoice.notes ? (
              <div className="rounded-card border border-border bg-app/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted">Notes</p>
                <p className="mt-1 text-sm text-ink">{invoice.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment summary</CardTitle>
            <CardDescription>
              Stripe-inspired checkout handoff with clear totals and no unnecessary steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-card border border-border bg-app/50 p-4">
              <SummaryRow label="Subtotal" value={formatMoney(invoice.currency, invoice.subtotal)} />
              <SummaryRow label="Tax" value={formatMoney(invoice.currency, invoice.tax)} />
              <SummaryRow label="Total" value={formatMoney(invoice.currency, invoice.total)} strong />
              <SummaryRow label="Paid" value={formatMoney(invoice.currency, invoice.paidAmount)} />
              <SummaryRow label="Balance" value={formatMoney(invoice.currency, balance ?? "0.00")} strong />
            </div>

            {error ? (
              <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {isPaid ? (
              <div className="rounded-card border border-success/20 bg-success/5 p-4">
                <p className="text-sm font-semibold text-success">Invoice already paid</p>
                <p className="mt-1 text-sm text-muted">No further action is needed for this invoice.</p>
              </div>
            ) : isClosed ? (
              <div className="rounded-card border border-warning/20 bg-warning/5 p-4">
                <p className="text-sm font-semibold text-warning">This invoice is closed</p>
                <p className="mt-1 text-sm text-muted">Please contact the clinic if you need a replacement invoice.</p>
              </div>
            ) : invoice.stripeCheckoutUrl ? (
              <a
                href={invoice.stripeCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                Continue to Secure Checkout
              </a>
            ) : (
              <Button className="w-full" loading={payLinkLoading} onClick={handleGeneratePayLink}>
                Generate Secure Checkout Link
              </Button>
            )}

            <p className="text-xs leading-5 text-muted">
              Secure checkout opens in a separate page. If you prefer to pay at the clinic, keep this invoice number handy.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
