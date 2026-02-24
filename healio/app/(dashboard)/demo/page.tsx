import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardDemoPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Today&apos;s Schedule</CardTitle>
          <CardDescription>
            Bento-style overview of the clinic day for fast scanning.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            ["9:00 AM", "Maria Santos", "Follow-up Consultation", "Checked in"],
            ["10:30 AM", "John Cruz", "Initial Assessment", "Pending"],
            ["1:00 PM", "Ava Reyes", "Therapy Session", "Confirmed"],
            ["3:30 PM", "Walk-in Slot", "Available", "Open"],
          ].map(([time, patient, service, status]) => (
            <div key={`${time}-${patient}`} className="rounded-control border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{time}</p>
                <Badge
                  variant={
                    status === "Checked in"
                      ? "success"
                      : status === "Pending"
                        ? "warning"
                        : "primary"
                  }
                >
                  {status}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{patient}</p>
              <p className="text-sm text-muted">{service}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Bills</CardTitle>
          <CardDescription>Quick glance at billing follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-control border border-border bg-warning/10 p-3">
            <p className="text-sm font-semibold text-ink">4 invoices pending</p>
            <p className="text-sm text-muted">₱12,400 awaiting payment</p>
          </div>
          <div className="rounded-control border border-border bg-surface p-3">
            <p className="text-sm font-medium text-ink">2 due today</p>
            <p className="text-sm text-muted">Send reminders before 6:00 PM</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unread Messages</CardTitle>
          <CardDescription>WhatsApp/SMS replies from patients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-control border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-ink">Maria Santos</p>
            <p className="text-sm text-muted">
              “Can I move my appointment to 10:00 AM?”
            </p>
          </div>
          <div className="rounded-control border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-ink">2 new confirmations</p>
            <p className="text-sm text-muted">Patients replied YES to reminders.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Empty State Example</CardTitle>
          <CardDescription>
            Friendly onboarding guidance for new solo practitioners.
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-control border border-dashed border-border bg-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Your day is clear! Let&apos;s add your first appointment.
              </p>
              <p className="mt-1 text-sm text-muted">
                Use the floating + action to create a patient, book a visit, or draft an invoice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
