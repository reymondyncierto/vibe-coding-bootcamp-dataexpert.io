"use client";

import { useEffect, useState } from "react";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import type { AnalyticsDashboardData } from "@/components/analytics/types";
import { AnalyticsSummaryCards } from "@/components/analytics/analytics-summary-cards";
import { ServiceBreakdownChart } from "@/components/analytics/service-breakdown-chart";
import { TrendCharts } from "@/components/analytics/trend-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";

function localAuthHeaders() {
  if (typeof window === "undefined") return {} as HeadersInit;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return {};
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
  };
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AnalyticsDashboardData };

export default function AnalyticsPage() {
  const { pushToast } = useToast();
  const [days, setDays] = useState("14");
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setState((current) => (current.kind === "ready" ? current : { kind: "loading" }));
      try {
        const response = await fetch(`/api/v1/analytics?days=${encodeURIComponent(days)}`, {
          headers: localAuthHeaders(),
          cache: "no-store",
        });
        const json = (await response.json()) as ApiSuccess<AnalyticsDashboardData> | ApiFailure;
        if (!response.ok || !json.success) {
          throw new Error(!json.success ? json.error.message : "Unable to load analytics.");
        }
        if (cancelled) return;
        setState({ kind: "ready", data: json.data });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unknown analytics error.";
        setState({ kind: "error", message });
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [days, refreshTick]);

  function triggerRefresh() {
    setRefreshTick((value) => value + 1);
    pushToast({
      title: "Refreshing analytics",
      description: "Reloading summary cards and trend data.",
      variant: "success",
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Clinic Performance Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            A bento-style snapshot of collections, visit volume, no-shows, and service performance for the front desk and clinic owner.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            name="analytics-range-days"
            value={days}
            onChange={(e) => setDays(e.currentTarget.value)}
            className="min-w-[140px]"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </Select>
          <Button variant="secondary" onClick={triggerRefresh}>Refresh</Button>
        </div>
      </header>

      {state.kind === "loading" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Skeleton className="h-80 w-full rounded-card" />
            <Skeleton className="h-80 w-full rounded-card" />
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle>Analytics unavailable</CardTitle>
            <CardDescription>
              The dashboard could not load. Verify the analytics API and clinic auth context, then retry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{state.message}</div>
            <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
              <p className="font-medium text-ink">Getting started</p>
              <p className="mt-1 text-muted">
                Create appointments and invoices first. Analytics cards and charts are intentionally empty-state friendly for new clinics.
              </p>
            </div>
            <Button onClick={triggerRefresh}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={state.data.cache.hit ? "neutral" : "primary"}>
              {state.data.cache.hit ? "Cached response" : "Fresh response"}
            </Badge>
            <Badge variant="success">{state.data.range.startDate} → {state.data.range.endDate}</Badge>
            <Badge variant="warning">{state.data.summary.overdueInvoices} overdue invoices</Badge>
          </div>

          <AnalyticsSummaryCards data={state.data} />
          <TrendCharts data={state.data} />
          <ServiceBreakdownChart data={state.data} />
        </>
      ) : null}
    </div>
  );
}

