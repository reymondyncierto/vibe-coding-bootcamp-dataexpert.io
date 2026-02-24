"use client";

import type { InvoiceSummary } from "@/hooks/useInvoices";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function currencyFormat(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount);
}

export function BillingSummaryCards({ invoices, isLoading }: { invoices: InvoiceSummary[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totals = invoices.reduce(
    (acc, invoice) => {
      const total = Number(invoice.total) || 0;
      const paid = Number(invoice.paidAmount) || 0;
      acc.outstanding += Math.max(0, total - paid);
      acc.collected += paid;
      acc.totalBilled += total;
      if (invoice.status === "OVERDUE") acc.overdue += 1;
      return acc;
    },
    { outstanding: 0, collected: 0, totalBilled: 0, overdue: 0 },
  );

  const cards = [
    { label: "Invoices (Page)", value: String(invoices.length), hint: "Current filtered page count" },
    { label: "Outstanding", value: currencyFormat(totals.outstanding), hint: "Balance remaining on listed invoices" },
    { label: "Collected", value: currencyFormat(totals.collected), hint: "Paid amount recorded on listed invoices" },
    { label: "Overdue", value: String(totals.overdue), hint: "Invoices currently marked overdue" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
