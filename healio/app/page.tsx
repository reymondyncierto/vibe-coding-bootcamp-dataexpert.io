import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-app px-6 py-12 text-ink">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            Healio
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Core UI primitives ready
          </h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-muted">
            Paper-friendly buttons, cards, inputs, select controls, and badges
            are now available for upcoming scheduling, patients, and billing
            workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="primary">Trust Accent</Badge>
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Overdue</Badge>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Saving</Button>
          </div>
        </Card>

        <aside className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Intake Controls</CardTitle>
              <CardDescription>
                Large, forgiving inputs and clear affordances for reception-side
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block">
                <span className="healio-label">Patient Name</span>
                <Input
                  className="mt-1"
                  placeholder="e.g., Maria Santos"
                  aria-label="Patient Name"
                />
              </label>
              <label className="block">
                <span className="healio-label">Visit Type</span>
                <Select className="mt-1" aria-label="Visit Type" defaultValue="">
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>Consultation</option>
                  <option>Follow-up</option>
                  <option>Physical Therapy</option>
                </Select>
              </label>
              <label className="block">
                <span className="healio-label">Phone</span>
                <Input
                  className="mt-1"
                  placeholder="+63 912 345 6789"
                  hasError
                  defaultValue="+63 912"
                  aria-invalid="true"
                  aria-describedby="phone-error"
                />
                <p id="phone-error" className="mt-1 text-xs text-danger">
                  Enter the full number to send reminders.
                </p>
              </label>
            </CardContent>
            <CardFooter>
              <Button className="flex-1 sm:flex-none">Save Patient</Button>
              <Button variant="secondary" className="flex-1 sm:flex-none">
                Create Invoice
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessibility Base</CardTitle>
              <CardDescription>
                Focus rings, reduced-motion fallbacks, and state variants are
                ready for upcoming modals and drawers.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                className="inline-flex min-h-11 items-center rounded-control border border-border px-4 py-2 text-sm font-medium text-ink"
                href="#"
              >
                Focus me with Tab
              </a>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
