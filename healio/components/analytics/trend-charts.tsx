import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsDashboardData } from "@/components/analytics/types";

function formatCompactCurrency(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function buildLinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrendCharts({ data }: { data: AnalyticsDashboardData }) {
  const revenueValues = data.trends.map((point) => point.collectedCents);
  const appointmentValues = data.trends.map((point) => point.appointmentsCount);
  const linePath = buildLinePath(revenueValues, 520, 140);
  const maxAppointments = Math.max(...appointmentValues, 1);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Collected vs billed performance across the selected date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.trends.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-app/40 p-5 text-sm text-muted">
              No analytics trend data yet. Create invoices and complete appointments to populate the chart.
            </div>
          ) : (
            <>
              <div className="rounded-card border border-border bg-white p-3">
                <svg viewBox="0 0 520 160" className="h-40 w-full" role="img" aria-label="Revenue trend line chart">
                  <defs>
                    <linearGradient id="healio-revenue-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(14, 165, 164, 0.28)" />
                      <stop offset="100%" stopColor="rgba(14, 165, 164, 0.02)" />
                    </linearGradient>
                  </defs>
                  <path d={`M0,140 ${linePath.replaceAll("M", "L")} L520,140 Z`} fill="url(#healio-revenue-fill)" />
                  <path d={linePath} fill="none" stroke="#0EA5A4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {revenueValues.map((value, index) => {
                    const x = revenueValues.length === 1 ? 520 / 2 : (index / (revenueValues.length - 1)) * 520;
                    const y = 140 - (value / Math.max(...revenueValues, 1)) * 140;
                    return <circle key={`${index}-${value}`} cx={x} cy={y} r="3.5" fill="#0EA5A4" />;
                  })}
                </svg>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.trends.slice(-6).map((point) => (
                  <div key={point.date} className="rounded-card border border-border bg-white px-3 py-2 text-sm">
                    <p className="font-medium text-ink">{point.date}</p>
                    <p className="mt-1 text-muted">Collected {formatCompactCurrency(point.collectedCents)}</p>
                    <p className="text-muted">Billed {formatCompactCurrency(point.billedCents)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Visit Volume</CardTitle>
          <CardDescription>Appointments and no-shows by day for front-desk pacing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.trends.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-app/40 p-5 text-sm text-muted">
              No visit volume yet.
            </div>
          ) : (
            data.trends.slice(-10).map((point) => {
              const widthPct = Math.round((point.appointmentsCount / maxAppointments) * 100);
              return (
                <div key={point.date} className="rounded-card border border-border bg-white p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{point.date}</span>
                    <span>{point.appointmentsCount} appts • {point.noShows} no-show</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(widthPct, point.appointmentsCount ? 8 : 0)}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

