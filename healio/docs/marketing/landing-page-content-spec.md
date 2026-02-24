# Healio Landing Page IA and Positioning Copy Spec

## Task Scope

This spec defines the implementation-ready content, section hierarchy, and component mapping for the Healio marketing homepage.
It is based on `landing-page-benchmark.md`, the PRD, and the existing implemented feature set (public booking, appointments, patients, billing, analytics, settings, RBAC/auth context, audit/compliance messaging baseline).

## Primary Audience and Conversion Goals

### Primary buyer

- Clinic owner / practice administrator evaluating a paper replacement or fragmented-tool replacement.

### Secondary users (must feel included)

- Doctor / provider (needs fast charting + schedule context)
- Receptionist / front desk (needs quick booking + patient intake + billing handoff)

### Conversion goals

- Primary CTA: `Start Free`
- Secondary CTA: `Book a Demo`
- Supporting CTA (mid/late page): `See How It Works`

## Positioning Statement (core message)

Healio is a multi-tenant clinic operations system that helps clinics run bookings, patient records, billing, and reminders in one calm workspace with role-based access and clinic-scoped data.

## Messaging Guardrails

- Speak in clinic workflow outcomes, not generic productivity jargon.
- Avoid unsupported compliance claims (do not claim HIPAA certification if not documented).
- Mention security, audit logs, encryption, and role-based access in accurate terms.
- Do not lead with "AI" language; lead with operational clarity and reliability.
- Keep copy readable under stress: short lines, concrete verbs, low jargon.

## Page IA (section-by-section)

## 1. Header / Top Nav

### Purpose

Orient users quickly and expose the two conversion paths.

### Navigation labels

- `Features`
- `How it works`
- `Security`
- `Pricing`
- `Log in`
- `Start Free` (primary button)
- `Book a Demo` (secondary button)

### Notes

- On mobile, collapse non-auth links behind a menu button.
- `Start Free` and `Book a Demo` should remain visible/high-priority.

## 2. Hero (Problem → Outcome → CTA)

### Headline options (choose one)

- `Run your clinic in one calm workspace.`
- `Appointments, patient records, billing, and reminders — finally in one place.`
- `Replace paper chaos with a clinic system your staff can use in one day.`

### Recommended headline

`Run your clinic in one calm workspace.`

### Subheadline

`Healio brings booking, patient records, invoices, reminders, and daily operations together for clinic owners, doctors, and front-desk staff — with clinic-scoped data and role-based access built in.`

### CTA cluster

- Primary: `Start Free`
- Secondary: `Book a Demo`
- Supporting microcopy: `No card required for trial setup.` (only if true in product flow; otherwise omit)

### Trust chips (under CTA)

- `Clinic-scoped data`
- `Role-based access`
- `Audit-ready activity logs`
- `SMS / WhatsApp reminders`

### Visual content (hero right / lower area)

A composed bento dashboard preview showing:
- Today’s appointments
- Pending invoices
- Reminder queue
- Unread messages / follow-ups
- Quick actions (`+ Add Appointment`, `+ Add Patient`, `+ Create Invoice`)

## 3. Trust Band (social proof / category fit)

### Purpose

Build confidence immediately after hero, before detailed feature sections.

### Content options

- Clinic-type chips (if logos unavailable yet):
  - `Family Practice`
  - `Dental Clinic`
  - `Therapy / Rehab`
  - `Small Specialty Clinic`
- Trust cards/chips:
  - `Designed for multi-user clinic teams`
  - `Centralized scheduling + billing`
  - `Patient records and billing history in one system`

### Placeholder note

Use neutral placeholders now; replace with real logos/testimonials later.

## 4. Bento Value Section: “Everything your team needs today”

### Section heading

`See today’s clinic at a glance.`

### Supporting copy

`Healio’s bento-style dashboard separates what matters — schedule, billing, follow-ups, and reminders — so your staff can scan the day without digging through tabs.`

### Bento cards (copy)

- **Today’s Schedule**
  - `Upcoming visits, late arrivals, and quick status actions in one list.`
- **Billing Queue**
  - `See unpaid invoices, send payment links, and follow up before end of day.`
- **Patient Follow-ups**
  - `Track callbacks, no-shows, and late cancellations without paper notes.`
- **Messages & Reminders**
  - `Keep SMS/WhatsApp reminders and confirmations visible to the front desk.`
- **Quick Actions**
  - `Add appointment, add patient, or create invoice in one click.`

## 5. Workflow Sequence (“How Healio works”) 

### Section heading

`From booking to payment, every step stays connected.`

### Step cards / timeline

1. **Book**
- `Let patients request slots online or book them at the front desk in seconds.`

2. **Treat**
- `Open the patient profile, review notes, and update chart details during the visit.`

3. **Bill**
- `Generate invoices quickly, apply line items, and send secure payment links.`

4. **Remind**
- `Trigger confirmations and reminders to reduce missed visits and payment delays.`

5. **Track**
- `Monitor daily activity, outstanding balances, and clinic performance trends.`

### UX framing callout

`Built for in-context work: common tasks open in focused drawers and dialogs so staff stay oriented while the schedule stays visible.`

## 6. Role-Based Value Section (multi-user workflows)

### Section heading

`One system for the whole clinic — without everyone seeing everything.`

### Intro copy

`Healio supports clinic owners, doctors, and front-desk staff in the same workspace with role-aware access and clinic-scoped records.`

### Role cards (tabbed or grid)

- **Clinic Owner / Admin**
  - `Monitor schedule utilization, billing status, and team activity from one dashboard.`
  - `Manage clinic settings, services, booking rules, and staff access.`
- **Doctor / Provider**
  - `Review today’s patients, update notes, and move visits forward without admin clutter.`
  - `See the right chart and appointment details for your schedule.`
- **Receptionist / Front Desk**
  - `Book visits, register patients, send reminders, and create invoices quickly.`
  - `Handle high-volume interruptions with fast, forgiving workflows.`

## 7. Multi-Tenant / Scale Section

### Section heading

`Built to grow from a solo clinic to a busy multi-provider practice.`

### Copy

`Healio is structured for multi-tenant operations, so each clinic’s data stays scoped while staff collaborate inside the right workspace. Add users and providers as your practice grows without rebuilding your processes.`

### Proof bullets (accurate positioning)

- `Clinic-scoped data boundaries`
- `Role-based access control`
- `Audit and activity tracking foundations`
- `Configurable booking rules and clinic settings`

## 8. Billing + Collections Trust Section

### Section heading

`Billing that keeps up with the front desk.`

### Copy

`Create invoices, send payment links, and track overdue balances without switching tools. Healio keeps billing tied to appointments and patient records so your team has context when it matters.`

### Feature bullets

- `Invoice creation and updates`
- `Payment link generation`
- `Overdue invoice tracking`
- `Billing dashboard visibility`

### Optional support line

`Stripe-powered payment flows can be integrated for secure checkout and webhook reconciliation.`

## 9. Security / Audit / Reliability Section

### Section heading

`Trustworthy by design for clinic operations.`

### Copy

`When your team handles patient information and billing, reliability matters. Healio emphasizes clear permissions, auditability, and operational safeguards so staff can move quickly without losing control.`

### Trust points (accurate claims only)

- `Role-based access patterns`
- `Audit/logging and activity tracking foundations`
- `Encrypted handling for sensitive patient data fields`
- `Clinic settings and booking rules managed centrally`

## 10. Onboarding / Empty-State Promise

### Section heading

`Start simple. Grow without re-training your whole staff.`

### Copy

`Healio is designed to feel approachable on day one with clear actions, guided empty states, and a dashboard that helps teams know what to do next.`

### Supporting bullets

- `Visible quick actions for the most common tasks`
- `Friendly empty states for new clinics`
- `Mobile-friendly layouts for reception and providers on the move`

## 11. FAQ Section

### Heading

`Questions clinic teams usually ask before switching`

### FAQ items (draft)

- **Can multiple staff members use Healio at the same time?**
  - `Yes. Healio is designed for multi-user clinic teams with role-based access so front desk, doctors, and admins can work in the same clinic workspace.`
- **Does Healio support online booking?**
  - `Yes. Healio includes a public booking flow with service/provider/slot selection and patient intake.`
- **Can we handle billing inside Healio?**
  - `Yes. Healio includes invoicing workflows, payment link generation, billing dashboards, and overdue tracking flows.`
- **Will this work for a solo clinic?**
  - `Yes. The same setup supports a solo practice and can expand as you add staff or providers.`
- **How does Healio protect clinic data?**
  - `Healio uses clinic-scoped data boundaries, role-aware access patterns, and audit/logging foundations to support secure operations.`

## 12. Final CTA Section

### Heading

`Replace paper chaos with a calmer clinic day.`

### Supporting copy

`Start with bookings and billing, then expand to patient records, reminders, and team workflows — all in one system.`

### CTA buttons

- `Start Free`
- `Book a Demo`

### Reassurance line

`Built for solo clinics and growing multi-provider teams.`

## 13. Footer

### Footer groups (concise)

- **Product**: Features, Booking, Patients, Billing, Analytics, Pricing
- **Trust**: Security, Auditability, Status (placeholder)
- **Company**: About (placeholder), Contact, Docs (placeholder)
- **Legal**: Privacy, Terms

## Component Mapping Plan (`components/marketing/*`)

### Recommended reusable components

- `marketing/landing-header.tsx`
- `marketing/hero.tsx`
- `marketing/trust-band.tsx`
- `marketing/dashboard-bento-preview.tsx`
- `marketing/workflow-sequence.tsx`
- `marketing/role-benefits.tsx`
- `marketing/multi-tenant-section.tsx`
- `marketing/billing-trust-section.tsx`
- `marketing/security-section.tsx`
- `marketing/onboarding-promise.tsx`
- `marketing/faq.tsx`
- `marketing/final-cta.tsx`
- `marketing/marketing-footer.tsx`

### Inline-only content (okay to keep in `app/page.tsx` if time-bound)

- Simple section wrappers/composition layout
- Static arrays passed into reusable sections

### Componentization priority for HEALIO-079

1. Header
2. Hero
3. Bento preview
4. Workflow sequence
5. Role benefits
6. Final CTA / footer

## Content-to-Feature Accuracy Mapping (implemented areas)

Safe to reference now:
- Public booking flow (`/book/[slug]`)
- Appointment management (daily/weekly views, detail drawer, status actions)
- Patients list/profile, notes/documents shell
- Billing dashboard, invoices, payment links
- Settings / clinic profile / booking rules
- Subscription/upgrade flow baseline
- Analytics and reporting areas (if phrased carefully as dashboards/monitoring, not advanced BI claims)
- RBAC / tenant-scoped data / audit foundations (phrased as architecture and controls, not compliance certification)

Avoid explicit claims unless documented/configured in deployment:
- HIPAA certification/compliance guarantees
- Production uptime/SLA numbers
- Named customer logos/testimonials
- WhatsApp integration guarantees if not enabled in the deployed environment

## Implementation Notes for HEALIO-079

- Keep the landing page static/client-light unless interactivity is needed (FAQ accordion optional).
- Reuse existing UI primitives (`Button`, `Card`, `Badge`) to stay visually consistent with Healio tokens.
- Use a soft off-white page background with white cards and calm teal accent emphasis.
- Ensure the homepage no longer renders `PrimitivesShowcase`.
