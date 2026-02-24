"use client";

import { useState } from "react";

import { BillingSummaryCards } from "@/components/billing/billing-summary-cards";
import { InvoiceList } from "@/components/billing/invoice-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoicesList, type InvoiceStatus } from "@/hooks/useInvoices";

export default function BillingDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const invoicesQuery = useInvoicesList({ status: statusFilter, page: 1, pageSize: 50 }, { retry: false });
  const invoices = invoicesQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Billing Dashboard</CardTitle>
              <CardDescription>
                Revenue and collections at a glance with a scannable bento layout and fast invoice follow-up workflow.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={invoicesQuery.isError ? "danger" : invoicesQuery.isFetching ? "warning" : "success"}>
                {invoicesQuery.isError ? "Error" : invoicesQuery.isFetching ? "Refreshing" : "Connected"}
              </Badge>
              <Button type="button" variant="secondary" onClick={() => void invoicesQuery.refetch()}>
                Refresh Data
              </Button>
              <Button type="button" disabled title="Invoice generator drawer arrives in HEALIO-050.">
                Create Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-card border border-border bg-app/50 p-4 text-sm text-muted">
            Stripe-style in-context invoice creation and send actions will be added next. This page focuses on list visibility, filters, and summary signals for fast front desk billing triage.
          </div>
        </CardContent>
      </Card>

      <BillingSummaryCards invoices={invoices} isLoading={invoicesQuery.isLoading} />

      <InvoiceList
        invoices={invoices}
        isLoading={invoicesQuery.isLoading}
        isError={invoicesQuery.isError}
        errorMessage={invoicesQuery.error?.message}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onRefresh={() => void invoicesQuery.refetch()}
      />
    </div>
  );
}
