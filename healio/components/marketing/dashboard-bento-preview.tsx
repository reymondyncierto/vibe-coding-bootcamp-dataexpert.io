import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const scheduleRows = [
  { time: "9:00", patient: "Maria Santos", status: "Checked in" },
  { time: "10:30", patient: "James Lee", status: "Waiting" },
  { time: "1:15", patient: "Ana Cruz", status: "Confirmed" },
];

const reminderRows = [
  { label: "24h reminders", count: 12 },
  { label: "1h reminders", count: 6 },
  { label: "Follow-ups", count: 4 },
];

export function DashboardBentoPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -right-6 bottom-8 h-28 w-28 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-primary/10 sm:col-span-2">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-emerald-300" />
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Today at a glance
              </p>
              <CardTitle className="mt-1 text-lg">Clinic dashboard</CardTitle>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="primary">Clinic-scoped</Badge>
              <Badge variant="success">Audit-ready</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pb-5 sm:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-border bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Schedule</p>
                <span className="text-xs text-muted">12 visits</span>
              </div>
              <div className="space-y-2">
                {scheduleRows.map((row) => (
                  <div
                    key={`${row.time}-${row.patient}`}
                    className="flex items-center justify-between rounded-xl border border-white bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-muted">{row.time}</p>
                      <p className="text-sm font-medium text-ink">{row.patient}</p>
                    </div>
                    <Badge
                      variant={
                        row.status === "Waiting"
                          ? "warning"
                          : row.status === "Checked in"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {row.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Pending invoices
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">$3,240</p>
                <p className="mt-1 text-sm text-muted">8 invoices need follow-up today</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Reminder queue
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {reminderRows.map((row) => (
                    <li key={row.label} className="flex items-center justify-between">
                      <span className="text-muted">{row.label}</span>
                      <span className="font-semibold text-ink">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Quick actions
            </p>
            <CardTitle className="text-base">One-click tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-5">
            {['+ Add Appointment', '+ Add Patient', '+ Create Invoice'].map((action) => (
              <div key={action} className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-ink">
                {action}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Team visibility
            </p>
            <CardTitle className="text-base">Shared workflow, role-aware access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-5 text-sm text-muted">
            <p>Front desk books and sends reminders.</p>
            <p>Doctors open chart details without billing clutter.</p>
            <p>Owners monitor schedule and revenue from one dashboard.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
