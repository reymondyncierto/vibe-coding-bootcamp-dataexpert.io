"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogFilters, type AuditLogFiltersState } from "@/components/settings/audit-log-filters";
import { AuditLogTable, type AuditLogItemView } from "@/components/settings/audit-log-table";

type AuditLogResponse = {
  items: AuditLogItemView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  chainIntegrity: {
    ok: boolean;
    brokenAtId: string | null;
    totalEntries: number;
  };
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AuditLogResponse };

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

export function AuditLogCard() {
  const [filters, setFilters] = useState<AuditLogFiltersState>({ q: "", action: "" });
  const [submittedFilters, setSubmittedFilters] = useState<AuditLogFiltersState>({ q: "", action: "" });
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshTick, setRefreshTick] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "8" });
    if (submittedFilters.q.trim()) params.set("q", submittedFilters.q.trim());
    if (submittedFilters.action) params.set("action", submittedFilters.action);
    return params.toString();
  }, [submittedFilters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState((current) => (current.kind === "ready" ? current : { kind: "loading" }));
      try {
        const response = await fetch(`/api/v1/audit-logs?${queryString}`, {
          headers: localAuthHeaders(),
          cache: "no-store",
        });
        const json = (await response.json()) as ApiSuccess<AuditLogResponse> | ApiFailure;
        if (!response.ok || !json.success) {
          throw new Error(!json.success ? json.error.message : "Unable to load audit logs.");
        }
        if (cancelled) return;
        setState({ kind: "ready", data: json.data });
      } catch (error) {
        if (cancelled) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Unknown error" });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshTick]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Audit Log (Owner Only)</CardTitle>
        <CardDescription>
          Append-only compliance timeline for settings, billing, and access-sensitive actions. Entries are chain-verified for tamper detection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AuditLogFilters
          value={filters}
          onChange={setFilters}
          onRefresh={() => {
            setSubmittedFilters(filters);
            setRefreshTick((v) => v + 1);
          }}
        />

        {state.kind === "loading" ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {state.message}
          </div>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <div className="text-xs text-muted">
              Showing {state.data.items.length} of {state.data.total} entries
            </div>
            <AuditLogTable items={state.data.items} chainOk={state.data.chainIntegrity.ok} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

