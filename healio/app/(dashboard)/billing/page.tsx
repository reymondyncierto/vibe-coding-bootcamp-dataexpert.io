"use client";

import { useState } from "react";

import { BillingSummaryCards } from "@/components/billing/billing-summary-cards";
import { InvoiceGeneratorDrawer, type InvoiceGeneratorDrawerMode } from "@/components/billing/invoice-generator-drawer";
import { InvoiceList } from "@/components/billing/invoice-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoicesList, type InvoiceStatus } from "@/hooks/useInvoices";

export default function BillingDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<InvoiceGeneratorDrawerMode>({ type: "create" });

  const invoicesQuery = useInvoicesList({ status: statusFilter, page: 1, pageSize: 50 }, { retry: false });
  const invoices = invoicesQuery.data?.items ?? [];

  function openCreateDrawer() {
    setDrawerMode({ type: "create" });
    setDrawerOpen(true);
  }

  function openEditDrawer(invoiceId: string) {
    setDrawerMode({ type: "edit", invoiceId });
    setDrawerOpen(true);
  }

  return (
    <>
      <div className="space-y-4" aria-busy={invoicesQuery.isLoading || invoicesQuery.isFetching}>
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
                <Button type="button" onClick={openCreateDrawer}>
                  Create Invoice
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-card border border-border bg-app/50 p-4 text-sm text-muted">
              Stripe-style in-context invoice creation now opens a drawer from this dashboard so staff can draft, review, and edit line items without navigating away.
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
          onCreateInvoice={openCreateDrawer}
          onEditInvoice={openEditDrawer}
        />
      </div>

      <InvoiceGeneratorDrawer open={drawerOpen} mode={drawerMode} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
