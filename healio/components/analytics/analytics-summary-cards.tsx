import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsDashboardData } from "@/components/analytics/types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function StatCard({
  title,
  value,
  helper,
  badge,
}: {
  title: string;
  value: string;
  helper: string;
  badge?: { label: string; variant: "primary" | "success" | "warning" | "neutral" };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsSummaryCards({ data }: { data: AnalyticsDashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Collected Revenue"
        value={formatMoney(data.summary.totalCollectedCents)}
        helper={`Billed ${formatMoney(data.summary.totalBilledCents)} in last ${data.range.days} days`}
        badge={{ label: `${data.summary.collectionRatePercent}% collection`, variant: "success" }}
      />
      <StatCard
        title="Outstanding"
        value={formatMoney(data.summary.outstandingCents)}
        helper={`${data.summary.overdueInvoices} overdue invoices need follow-up`}
        badge={{ label: `${data.summary.paidInvoices}/${data.summary.invoicesTotal} paid`, variant: data.summary.overdueInvoices > 0 ? "warning" : "primary" }}
      />
      <StatCard
        title="Appointments"
        value={String(data.summary.appointmentsTotal)}
        helper={`${data.summary.completedAppointments} completed, ${data.summary.noShows} no-show`}
        badge={{ label: `${data.summary.cancellationRatePercent}% cancelled`, variant: "neutral" }}
      />
      <StatCard
        title="Patients Seen"
        value={String(data.summary.uniquePatientsSeen)}
        helper={`Unique patient visits in ${data.range.startDate} to ${data.range.endDate}`}
        badge={{ label: data.cache.hit ? "Cache hit" : "Fresh", variant: data.cache.hit ? "neutral" : "primary" }}
      />
    </div>
  );
}

