import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsDashboardData } from "@/components/analytics/types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ServiceBreakdownChart({ data }: { data: AnalyticsDashboardData }) {
  const rows = data.serviceBreakdown.slice(0, 8);
  const maxAppointments = Math.max(...rows.map((row) => row.appointmentsCount), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Service Breakdown</CardTitle>
        <CardDescription>Which services are driving volume and collections in the selected range.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-app/40 p-5 text-sm">
            <p className="font-medium text-ink">No service analytics yet</p>
            <p className="mt-1 text-muted">Complete appointments and attach invoices to see service performance.</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.serviceId} className="rounded-card border border-border bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink">{row.serviceName}</p>
                <p className="text-xs text-muted">{row.appointmentsCount} appts • {row.completedAppointments} done • {row.noShows} no-show</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.max(8, Math.round((row.appointmentsCount / maxAppointments) * 100))}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>Billed: <strong className="text-ink">{formatMoney(row.billedCents)}</strong></span>
                <span>Collected: <strong className="text-ink">{formatMoney(row.collectedCents)}</strong></span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

