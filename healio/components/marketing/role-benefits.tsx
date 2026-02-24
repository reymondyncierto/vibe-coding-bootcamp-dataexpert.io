import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roles = [
  {
    title: "Clinic Owner / Admin",
    badge: "Revenue + Operations",
    points: [
      "Monitor schedule utilization, billing status, and team activity from one dashboard.",
      "Manage services, booking rules, and staff access in clinic settings.",
    ],
  },
  {
    title: "Doctor / Provider",
    badge: "Patient Context",
    points: [
      "Review today’s patients and visit notes without front-desk clutter.",
      "Move visits forward with chart context tied to the appointment.",
    ],
  },
  {
    title: "Receptionist / Front Desk",
    badge: "Speed + Clarity",
    points: [
      "Book visits, register patients, send reminders, and create invoices quickly.",
      "Handle interruptions with large, forgiving controls and visible next actions.",
    ],
  },
] as const;

export function RoleBenefits() {
  return (
    <section aria-labelledby="role-benefits-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Multi-User Workflows</p>
          <h2 id="role-benefits-heading" className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            One system for the whole clinic — without everyone seeing everything.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Healio supports clinic owners, doctors, and front-desk staff in the same workspace with role-aware access and clinic-scoped records.
          </p>
          <div className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-white px-3 py-2">Clinic-scoped data boundaries</div>
            <div className="rounded-xl border border-border bg-white px-3 py-2">Role-based access control</div>
            <div className="rounded-xl border border-border bg-white px-3 py-2">Audit and activity tracking foundations</div>
            <div className="rounded-xl border border-border bg-white px-3 py-2">Configurable booking rules</div>
          </div>
        </div>

        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.title}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <CardTitle className="text-base sm:text-lg">{role.title}</CardTitle>
                <Badge variant="primary" className="whitespace-nowrap">{role.badge}</Badge>
              </CardHeader>
              <CardContent className="pb-5">
                <ul className="space-y-2 text-sm leading-6 text-muted">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1 text-primary">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
