import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBentoPreview } from "@/components/marketing/dashboard-bento-preview";
import { FaqSection } from "@/components/marketing/faq";
import { LandingHeader } from "@/components/marketing/landing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RoleBenefits } from "@/components/marketing/role-benefits";
import { WorkflowSequence } from "@/components/marketing/workflow-sequence";

const trustChips = [
  "Clinic-scoped data",
  "Role-based access",
  "Audit-ready activity logs",
  "SMS / WhatsApp reminders",
] as const;

const featureCards = [
  {
    title: "Appointments and schedules",
    copy: "Daily and weekly views, quick status actions, and appointment details in context.",
  },
  {
    title: "Patient records and notes",
    copy: "Patient profiles, notes, documents, and visit history tied to real clinic workflows.",
  },
  {
    title: "Billing and payment links",
    copy: "Create invoices, send payment links, and track overdue balances without switching tabs.",
  },
  {
    title: "Reminders and follow-ups",
    copy: "Queue confirmation and reminder workflows to reduce no-shows and missed collections.",
  },
  {
    title: "Clinic settings and booking rules",
    copy: "Configure services, hours, booking rules, and staff access from one admin area.",
  },
  {
    title: "Analytics and visibility",
    copy: "Surface daily performance signals and operational bottlenecks for clinic owners.",
  },
] as const;

function SectionShell({
  id,
  label,
  title,
  description,
  children,
}: {
  id?: string;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={[
        "mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8",
        id ? "scroll-mt-24" : "",
      ].join(" ")}
    >
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
        <h2 id={id ? `${id}-heading` : undefined} className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        <p className="max-w-3xl text-base leading-7 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function LinkButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ring-offset-app",
        primary
          ? "bg-primary text-white hover:bg-primary-hover shadow-sm"
          : "border border-border bg-white text-ink hover:bg-slate-50",
      ].join(" ")}
      aria-label={typeof children === "string" ? children : undefined}
    >
      {children}
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-app text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/10 via-sky-200/30 to-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-[22rem] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <LandingHeader />

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Multi-tenant clinic operations software
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Run your clinic in one calm workspace.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
                Healio brings booking, patient records, invoices, reminders, and daily operations together for clinic owners, doctors, and front-desk staff — with clinic-scoped data and role-based access built in.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton href="/signup" primary>
                  Start Free
                </LinkButton>
                <LinkButton href="/signup?intent=demo">Book a Demo</LinkButton>
              </div>
              <p className="mt-3 text-sm text-muted">Designed for solo clinics and growing multi-provider teams.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {trustChips.map((chip) => (
                  <Badge key={chip} variant="neutral" className="bg-white/90 text-ink">
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <DashboardBentoPreview />
            </div>
          </div>
        </section>

        <section aria-label="Trust and clinic fit" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-3 rounded-3xl border border-border bg-white/80 p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Family Practice",
              "Dental Clinic",
              "Therapy / Rehab",
              "Small Specialty Clinic",
            ].map((clinic) => (
              <div key={clinic} className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3 text-sm font-medium text-ink">
                {clinic}
              </div>
            ))}
          </div>
        </section>

        <SectionShell
          id="features"
          label="Features"
          title="Everything your team needs today, without switching systems."
          description="Healio connects the front desk, the provider, and the clinic owner in one workflow so appointments, patient records, billing, and reminders stay in sync."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature, idx) => (
              <Card key={feature.title} className={idx % 3 === 0 ? "xl:translate-y-2" : idx % 3 === 1 ? "" : "xl:-translate-y-2"}>
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.copy}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-28 rounded-2xl border border-border bg-gradient-to-br from-slate-50 via-white to-primary/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionShell>

        <WorkflowSequence />

        <RoleBenefits />

        <SectionShell
          label="Scale"
          title="Built to grow from a solo clinic to a busy multi-provider practice."
          description="Healio is structured for multi-tenant operations, so each clinic’s data stays scoped while staff collaborate in the right workspace. Add users and providers as your practice grows without rebuilding your process."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-primary/10 bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Multi-tenant foundations</CardTitle>
                <CardDescription>
                  Clinic-scoped data boundaries, role-aware access patterns, and central clinic settings help teams scale safely.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Clinic-scoped data", "Keep patient, billing, and scheduling records isolated by clinic."],
                  ["Role-based access", "Owners, providers, and front desk staff see the right tools for their work."],
                  ["Booking rules", "Configure services, hours, and slot behavior per clinic."],
                  ["Audit foundations", "Track activity and changes across operational workflows."],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-2xl border border-border bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card id="billing" className="scroll-mt-24 bg-gradient-to-b from-white to-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">Billing that keeps up with the front desk</CardTitle>
                <CardDescription>
                  Create invoices, send payment links, and track overdue balances without losing patient or appointment context.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {[
                  "Invoice creation and updates",
                  "Payment link generation",
                  "Overdue invoice tracking",
                  "Billing dashboard visibility",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    {item}
                  </div>
                ))}
                <p className="text-xs leading-5 text-muted">
                  Stripe-powered payment flows can be integrated for secure checkout and webhook reconciliation.
                </p>
              </CardContent>
            </Card>
          </div>
        </SectionShell>

        <SectionShell
          id="security"
          label="Security and Trust"
          title="Trustworthy by design for clinic operations."
          description="When your team handles patient information and billing, reliability matters. Healio emphasizes clear permissions, auditability, and operational safeguards so staff can move quickly without losing control."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Role-based access patterns", "Keep workflows visible to the right staff roles."],
              ["Audit and activity tracking", "Review operational changes and key actions with clear history."],
              ["Sensitive field encryption", "Encrypt handling for patient-sensitive fields in supported flows."],
              ["Centralized clinic controls", "Manage booking rules and settings from one place."],
            ].map(([title, copy]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{copy}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          label="Onboarding"
          title="Start simple. Grow without re-training your whole staff."
          description="Healio is designed to feel approachable on day one with clear actions, guided empty states, and a dashboard that helps teams know what to do next."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Visible quick actions", "Add appointment, add patient, or create invoice from one clear entry point."],
              ["Friendly empty states", "Guide new clinics through setup instead of showing blank screens."],
              ["Mobile-ready layouts", "Reception and providers can scan key data on smaller screens."],
            ].map(([title, copy]) => (
              <Card key={title} className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{copy}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SectionShell>

        <FaqSection />

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-white via-white to-primary/5 p-6 shadow-card sm:p-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Get Started</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  Replace paper chaos with a calmer clinic day.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                  Start with bookings and billing, then expand to patient records, reminders, and team workflows — all in one system.
                </p>
                <p className="mt-3 text-sm text-muted">Built for solo clinics and growing multi-provider teams.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <LinkButton href="/signup" primary>
                  Start Free
                </LinkButton>
                <LinkButton href="/signup?intent=demo">Book a Demo</LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
