# Healio — Product Requirements Document (PRD)

> **Formerly:** CareDesk
> **Tagline:** _"The simplest way to run your clinic."_
> **Version:** 1.0 · February 2026

---

## Project Name

**Healio** — a short, warm, instantly memorable name that evokes healing. Alternative candidates considered: _ClinicPulse_, _MedEase_, _CareSync_.

---

## Description

Healio is a lightweight, modern **clinic management SaaS** purpose-built for **solo practitioners and small clinics** (1–5 doctors) — the massive segment that can't afford enterprise EMRs like Epic or Athena but desperately needs to move beyond paper charts, WhatsApp scheduling, and manual billing.

Healio gives clinics a single, beautiful dashboard to manage **appointments, patient records, billing, and notifications** — all without the bloat.

---

## Objective

1. Build a production-grade, multi-tenant SaaS platform that an independent doctor can sign up for and be productive within 10 minutes.
2. Serve **both the US and Philippine markets** with locale-aware features (timezone, currency, payment gateways, compliance).
3. Achieve a clean, premium UI/UX that instills trust — clinics are handing you patient data, so the product must _feel_ secure.
4. Ship an MVP that covers the core loop: **Book → Remind → Treat → Bill → Track**.
5. Design the system to be horizontally scalable, auditable, and compliant with data protection best practices from day one.

---

## 🏗️ 1. Architecture Design

### 1.1 High-Level Architecture

Healio follows a **unified Next.js monolith** architecture — the frontend, API layer, and scheduled jobs all live in a single Next.js 14 project. This means **one codebase, one deploy, one Vercel project**. No separate backend server to manage.

The API layer uses **Next.js Route Handlers** (`app/api/`) which run as serverless functions on Vercel. This eliminates CORS configuration (same-origin), simplifies deployment, and keeps the entire stack on Vercel's free tier.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SINGLE NEXT.JS 14 APPLICATION                          │
│                        (Deployed to Vercel)                                │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (app/)                                                    │   │
│  │  ─────────────────                                                  │   │
│  │  • Patient Booking Portal        → app/(public)/book/[slug]/        │   │
│  │  • Doctor Dashboard              → app/(dashboard)/appointments/    │   │
│  │  • Admin/Clinic Owner Panel      → app/(dashboard)/settings/        │   │
│  │  • Marketing Landing Page        → app/page.tsx                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  API LAYER (app/api/)            — Next.js Route Handlers           │   │
│  │  ────────────────────            (Serverless Functions on Vercel)    │   │
│  │  • RESTful endpoints (JSON)                                         │   │
│  │  • Supabase Auth verification (middleware.ts)                       │   │
│  │  • Role-based access control (RBAC)                                 │   │
│  │  • Rate limiting (Upstash @upstash/ratelimit)                       │   │
│  │  • Input validation (Zod)                                           │   │
│  │  • Structured logging (Pino)                                        │   │
│  └───────┬──────────────┬──────────────┬──────────────┬─────────────────┘   │
│          │              │              │              │                     │
│          ▼              ▼              ▼              ▼                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐           │
│  │ PostgreSQL │ │  Supabase  │ │   Resend   │ │     Stripe     │           │
│  │  (Prisma)  │ │   Auth     │ │  (Email)   │ │  (Payments)    │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘           │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CRON JOBS (app/api/cron/)       — Vercel Cron Jobs                 │   │
│  │  • Appointment reminders         (every 5 min)                      │   │
│  │  • Overdue invoice checker       (daily at 9am)                     │   │
│  │  • Subscription billing check    (daily at midnight)                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS | SSR/SSG pages, patient booking portal, doctor dashboard, admin panel |
| **API Layer** | Next.js Route Handlers (`app/api/`) | RESTful endpoints as serverless functions, business logic, auth checks |
| **Middleware** | Next.js `middleware.ts` | Auth verification, RBAC guards, rate limiting (runs at edge) |
| **Database** | PostgreSQL + Prisma ORM | Multi-tenant data storage, audit logs, schema migrations |
| **Authentication** | Supabase Auth | OAuth (Google), magic-link login, JWT issuance, session management |
| **Email/SMS** | Resend (email) + Twilio (SMS — free trial) | Appointment reminders, booking confirmations, password resets |
| **Payments** | Stripe | Subscription billing, one-time invoices, webhook-driven events |
| **File Storage** | Supabase Storage | Patient document uploads, profile photos, clinic logos |
| **Scheduled Jobs** | Vercel Cron Jobs (`vercel.json` + `app/api/cron/`) | Reminder dispatch, overdue invoice checks, daily digest |
| **Hosting** | Vercel (entire app) + Supabase (DB + Auth + Storage) | Single-deploy with automatic CI/CD |

### 1.3 Multi-Tenancy Strategy

Healio uses **row-level tenancy** — all clinics share a single database, isolated by a `clinicId` foreign key on every tenant-scoped table. Prisma middleware automatically injects the `clinicId` filter on every query to prevent cross-tenant data leakage.

```
Every tenant-scoped query:
  prisma.patient.findMany()
    → middleware injects → WHERE clinicId = <current_user_clinic_id>
```

### 1.4 API Design Principles

- **RESTful conventions using Next.js file-based routing:**
  - `GET /api/v1/patients` → `app/api/v1/patients/route.ts` → `export async function GET()`
  - `POST /api/v1/appointments` → `app/api/v1/appointments/route.ts` → `export async function POST()`
  - `PATCH /api/v1/appointments/:id` → `app/api/v1/appointments/[id]/route.ts` → `export async function PATCH()`
- **Consistent response envelope:** `{ success: boolean, data?: T, error?: { code, message } }`
- **Helper functions:** Shared `lib/api-helpers.ts` with `successResponse()`, `errorResponse()`, `withAuth()`, `withValidation()` wrappers to reduce boilerplate in route handlers
- **Pagination:** Cursor-based with `?cursor=<id>&limit=20`
- **Versioning:** URL prefix `/api/v1/` from the start (easy to add `/api/v2/` later)
- **Idempotency:** POST operations accept an `Idempotency-Key` header for safe retries
- **No CORS needed:** Frontend and API share the same origin on Vercel — no cross-origin issues

---

## ✨ 2. Feature Design

### Feature 1: Patient Booking Portal (Public)

A clean, mobile-first public page where patients can self-book appointments without creating an account.

**Components:**
- **Clinic Landing Page** — Displays clinic name, logo, address, operating hours, and list of available services
- **Service Selector** — Patient picks a service (e.g., "General Consultation", "Dental Cleaning")
- **Provider Selector** — If multi-doctor clinic, patient picks their preferred doctor
- **Calendar & Time Slot Picker** — Shows available slots based on doctor's schedule; greys out unavailable times
- **Patient Info Form** — Collects name, phone, email, and reason for visit (no account required)
- **Booking Confirmation Screen** — Summary + "Add to Calendar" button (generates `.ics` file)

**Rules & Validation:**
- Patients cannot book slots in the past
- Minimum booking lead time: configurable (default 1 hour)
- Maximum advance booking: configurable (default 30 days)
- Duplicate booking prevention: same patient email + same day + same service = blocked with friendly message
- Phone number validated with regex per locale (PH: `+63`, US: `+1`)

**API Endpoints:**
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/public/clinics/:slug` | Get clinic public profile |
| `GET` | `/api/v1/public/clinics/:slug/services` | List available services |
| `GET` | `/api/v1/public/clinics/:slug/slots?date=YYYY-MM-DD&serviceId=X` | Get open time slots |
| `POST` | `/api/v1/public/bookings` | Create a new booking (no auth required) |

---

### Feature 2: Appointment Management Dashboard (Doctor)

The primary doctor-facing view — a day/week calendar showing all appointments with status indicators.

**Components:**
- **Daily Schedule View** (default) — Timeline-style list of today's appointments with patient name, service, status
- **Weekly Calendar View** — Grid view for the current week
- **Appointment Detail Drawer** — Slide-in panel showing full appointment details + patient quick-info
- **Status Workflow Buttons** — `Scheduled → Checked In → In Progress → Completed → No Show`
- **Quick Actions** — Reschedule, Cancel (with reason), Create Walk-in

**Status Flow:**
```
Scheduled ──► Checked In ──► In Progress ──► Completed
    │                                            │
    └──► No Show                                 └──► Needs Follow-up
    └──► Cancelled (reason required)
```

**Business Rules:**
- Cancellations within 24 hours are flagged as "Late Cancel" and tracked per patient
- No-show count is visible on the patient profile (helps clinics enforce no-show policies)
- Appointments default to 30 minutes; duration is configurable per service
- Overlapping appointments are blocked unless the doctor has enabled "double-booking" in settings

**API Endpoints:**
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/appointments?date=YYYY-MM-DD` | List appointments for date |
| `GET` | `/api/v1/appointments/:id` | Get appointment details |
| `POST` | `/api/v1/appointments` | Create appointment (staff-initiated) |
| `PATCH` | `/api/v1/appointments/:id` | Update appointment (reschedule, status change) |
| `DELETE` | `/api/v1/appointments/:id` | Cancel appointment (soft delete) |

---

### Feature 3: Patient Records (Lite EMR)

A simple, searchable digital patient chart. **Not** a full EMR — focused on visit notes, prescriptions, allergies, and contact info.

**Components:**
- **Patient List** — Searchable/filterable table with name, phone, last visit date, upcoming appointment
- **Patient Profile Page:**
  - **Demographics Card** — Name, DOB, gender, phone, email, address
  - **Medical Summary** — Allergies, chronic conditions, current medications (manual entry)
  - **Visit History Timeline** — Chronological list of all visits with notes
  - **Visit Note Editor** — Rich-text editor (TipTap) for SOAP notes (Subjective, Objective, Assessment, Plan)
  - **Documents Tab** — Upload/view scanned lab results, imaging, referral letters (stored in Supabase Storage)
  - **Billing Tab** — List of all invoices for this patient

**Rules & Validation:**
- Visit notes are **append-only** — once saved, they cannot be edited (only amended with a new note referencing the original). This is critical for medical-legal compliance.
- Patient records are scoped per clinic (`clinicId`) — a patient who visits two different clinics on Healio has separate records at each
- Search supports fuzzy matching on name and exact match on phone/email
- File uploads capped at 10MB per file, allowed types: `.pdf`, `.jpg`, `.png`, `.dcm`

**API Endpoints:**
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/patients` | List patients (paginated, searchable) |
| `GET` | `/api/v1/patients/:id` | Get patient profile |
| `POST` | `/api/v1/patients` | Create patient |
| `PATCH` | `/api/v1/patients/:id` | Update patient demographics |
| `POST` | `/api/v1/patients/:id/visits` | Create a visit note |
| `GET` | `/api/v1/patients/:id/visits` | List visit history |
| `POST` | `/api/v1/patients/:id/documents` | Upload a document |
| `GET` | `/api/v1/patients/:id/documents` | List documents |

---

### Feature 4: Billing & Invoicing

Generate, track, and collect payments for clinic services.

**Components:**
- **Invoice Generator** — Auto-populates from appointment + service; doctor can add line items
- **Invoice List** — Filterable by status (Draft, Sent, Paid, Overdue, Void)
- **Payment Recording** — Mark as paid (cash, card, GCash/Maya, bank transfer)
- **Online Payment Link** — Stripe Checkout link auto-appended to emailed invoices
- **Revenue Dashboard** — Daily/weekly/monthly revenue, collected vs. outstanding, breakdown by service
- **Tax Summary Export** — CSV/PDF export for accountant handoff (BIR-ready for PH, 1099-ready for US)

**Stripe Integration Details:**
- Each clinic is a **Stripe Connected Account** (Standard) — Healio takes a platform fee (e.g., 2%)
- Patients pay via Stripe Checkout (cards, Apple Pay, Google Pay)
- Webhook `checkout.session.completed` auto-marks the invoice as `PAID`
- Refunds processed via Stripe dashboard or API; webhook `charge.refunded` updates invoice status

**API Endpoints:**
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/invoices` | List invoices (paginated, filterable) |
| `POST` | `/api/v1/invoices` | Create invoice |
| `GET` | `/api/v1/invoices/:id` | Get invoice details |
| `PATCH` | `/api/v1/invoices/:id` | Update invoice (add line items, change status) |
| `POST` | `/api/v1/invoices/:id/send` | Email invoice to patient |
| `POST` | `/api/v1/invoices/:id/pay-link` | Generate Stripe Checkout link |
| `POST` | `/api/v1/webhooks/stripe` | Stripe webhook handler |

---

### Feature 5: Automated Reminders & Notifications

Reduce no-shows by 30–50% with automated, multi-channel reminders.

**Channels:**
- **Email** (via Resend) — primary channel, always on
- **SMS** (via Twilio free trial → upgrade) — opt-in per clinic

**Notification Types:**
| Trigger | Timing | Channel | Content |
|---|---|---|---|
| Booking Confirmation | Immediately on booking | Email + SMS | "Your appointment is confirmed for [date] at [time]" |
| Appointment Reminder | 24 hours before | Email + SMS | "Reminder: You have an appointment tomorrow at [time]" |
| Appointment Reminder | 1 hour before | SMS only | "Your appointment is in 1 hour. See you soon!" |
| No-show Follow-up | 2 hours after missed | Email | "We missed you today. Would you like to reschedule?" |
| Invoice Sent | On invoice creation | Email | Invoice PDF + payment link |
| Payment Confirmation | On payment received | Email | Receipt with breakdown |
| Follow-up Reminder | Configurable (e.g., 7 days post-visit) | Email | "Time for your follow-up visit" |

**Implementation:**
- Scheduled via **Vercel Cron Jobs** — a cron route (`app/api/cron/reminders/route.ts`) runs every 5 minutes, scanning for upcoming reminders
- Cron schedule defined in `vercel.json`: `{ "crons": [{ "path": "/api/cron/reminders", "schedule": "*/5 * * * *" }] }`
- Cron endpoints are protected with a `CRON_SECRET` header (Vercel auto-injects `Authorization: Bearer <CRON_SECRET>`) — rejects external callers
- Each notification is logged in a `Notification` table to prevent duplicates (idempotency)
- Templates stored as React Email components (`.tsx`) — type-safe, styled with Tailwind, rendered server-side via `@react-email/render`
- Rate limiting: maximum 3 notifications per patient per day

---

### Feature 6: Clinic Settings & Configuration

**Components:**
- **Clinic Profile** — Name, logo, address, phone, email, timezone, currency, booking page slug
- **Operating Hours** — Set open/close hours per day of week; holiday overrides
- **Services Manager** — CRUD for services (name, duration, price, description, color)
- **Staff Manager** — Invite/remove staff, assign roles (Owner, Doctor, Receptionist)
- **Notification Preferences** — Toggle reminder channels, customize reminder timing
- **Booking Rules** — Lead time, advance booking limit, double-booking toggle

---

### Feature 7: Authentication & User Roles (Supabase Auth)

**Auth Flows:**
- **Clinic Sign-Up:** Google OAuth or email magic link → creates Supabase user → triggers backend webhook to create `Clinic` + `Staff` records
- **Staff Invite:** Owner enters staff email → backend sends invite via Resend → staff clicks link → Supabase magic link → auto-joins the clinic
- **Patient Booking:** No auth required — patients are identified by email/phone

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|---|---|
| `OWNER` | Full access: settings, billing, staff management, patient records, appointments |
| `DOCTOR` | View/manage own appointments, create/view patient records, create invoices |
| `RECEPTIONIST` | Manage all appointments, view patient demographics (not medical notes), create invoices |

**Implementation:**
- Supabase issues JWTs with custom claims (`clinicId`, `role`)
- **Next.js `middleware.ts`** runs at the edge on every request to `/api/v1/*` and `/dashboard/*` — extracts the JWT from the `Authorization` header or cookie, verifies with Supabase `getUser()`, and attaches user context
- Route handlers use a `withAuth(handler, { roles: ['OWNER', 'DOCTOR'] })` wrapper that validates the role before executing the handler logic
- Row-level: Prisma client extension injects `clinicId` filter on all queries automatically
- Public routes (`/api/v1/public/*`) are excluded from auth middleware via matcher config

---

### Feature 8: Subscription & Pricing (Stripe Billing)

Healio itself charges clinics a monthly subscription.

**Pricing Tiers:**

| Tier | Price | Limits |
|---|---|---|
| **Free** | $0/mo | 1 provider, 50 patients, 30 appointments/mo, email reminders only |
| **Starter** | $29/mo | 1 provider, unlimited patients, unlimited appointments, SMS + email |
| **Clinic** | $89/mo | Up to 5 providers, multi-staff roles, priority support |
| **Enterprise** | $199/mo | Unlimited providers, API access, custom branding, dedicated support |

**Implementation:**
- On sign-up, clinic is placed on the `Free` tier
- Upgrade triggers Stripe Checkout (subscription mode)
- Webhook `invoice.paid` activates the tier
- Webhook `customer.subscription.deleted` downgrades to `Free`
- Feature flags in the backend check the `subscriptionTier` field before allowing access to gated features
- Grace period: 7 days after failed payment before downgrade

---

### Feature 9: Analytics Dashboard

**Metrics Displayed:**
- **Today's Stats** — Appointments count, patients seen, revenue collected
- **Weekly/Monthly Trends** — Line charts for appointment volume, revenue, no-show rate
- **Service Breakdown** — Pie chart showing revenue and volume per service
- **Patient Acquisition** — New patients per week/month
- **No-Show Rate** — Percentage trend over time
- **Outstanding Invoices** — Total unpaid amount, aging breakdown (0–30, 30–60, 60+ days)

**Implementation:**
- Computed server-side via aggregate Prisma queries
- Cached in Redis (or in-memory cache for MVP) with 5-minute TTL
- Frontend uses Recharts for chart rendering

---

### Feature 10: Audit Log

Every mutation (create, update, delete) is logged for compliance and debugging.

**Log Entry Fields:**
- `id`, `timestamp`, `clinicId`, `userId`, `action` (CREATE/UPDATE/DELETE), `entity` (Patient/Appointment/Invoice), `entityId`, `changes` (JSON diff of before/after), `ipAddress`

**Implementation:**
- Prisma middleware captures all write operations and logs them asynchronously
- Audit logs are **immutable** — no update/delete allowed
- Viewable by `OWNER` role in Settings → Audit Log (paginated, filterable by entity/user/date)

---

## 🗄️ 3. Database Design

The schema is managed via **Prisma ORM** with PostgreSQL. All tables use UUID primary keys, soft deletes (`deletedAt`), and timestamp tracking.

### `Clinic` Table
The top-level tenant entity.
- `id` (UUID, PK)
- `name` (String)
- `slug` (String, Unique) — used in public booking URL: `healio.app/book/<slug>`
- `logo` (String, nullable) — URL to Supabase Storage
- `address` (String, nullable)
- `phone` (String, nullable)
- `email` (String)
- `timezone` (String, default `Asia/Manila`)
- `currency` (Enum: `USD`, `PHP`, default `USD`)
- `subscriptionTier` (Enum: `FREE`, `STARTER`, `CLINIC`, `ENTERPRISE`, default `FREE`)
- `stripeCustomerId` (String, nullable)
- `stripeSubscriptionId` (String, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable)

### `Staff` Table
Users who operate the clinic (doctors, receptionists, owners).
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `supabaseUserId` (String, Unique) — links to Supabase Auth user
- `name` (String)
- `email` (String)
- `phone` (String, nullable)
- `role` (Enum: `OWNER`, `DOCTOR`, `RECEPTIONIST`)
- `specialization` (String, nullable) — e.g., "General Practitioner", "Orthodontist"
- `isActive` (Boolean, default `true`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable)

### `Patient` Table
Individuals receiving care at a clinic.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `firstName` (String)
- `lastName` (String)
- `dateOfBirth` (DateTime, nullable)
- `gender` (Enum: `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`, nullable)
- `phone` (String)
- `email` (String, nullable)
- `address` (String, nullable)
- `allergies` (String, nullable) — comma-separated or JSON
- `chronicConditions` (String, nullable)
- `currentMedications` (String, nullable)
- `emergencyContactName` (String, nullable)
- `emergencyContactPhone` (String, nullable)
- `notes` (String, nullable) — general notes visible to all staff
- `noShowCount` (Int, default `0`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable)

### `Service` Table
Types of services offered by the clinic.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `name` (String) — e.g., "General Consultation", "Teeth Cleaning"
- `description` (String, nullable)
- `durationMinutes` (Int, default `30`)
- `price` (Decimal)
- `color` (String, default `#3B82F6`) — for calendar display
- `isActive` (Boolean, default `true`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### `OperatingHours` Table
Weekly schedule for the clinic.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `dayOfWeek` (Int, 0–6, Monday=0)
- `openTime` (String, `HH:mm` format)
- `closeTime` (String, `HH:mm` format)
- `isClosed` (Boolean, default `false`)

### `Appointment` Table
The core booking entity.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `patientId` (FK → Patient)
- `staffId` (FK → Staff) — the assigned doctor
- `serviceId` (FK → Service)
- `startTime` (DateTime)
- `endTime` (DateTime)
- `status` (Enum: `SCHEDULED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`, `CANCELLED`)
- `cancellationReason` (String, nullable)
- `isWalkIn` (Boolean, default `false`)
- `notes` (String, nullable) — pre-visit notes from patient
- `source` (Enum: `ONLINE`, `PHONE`, `WALK_IN`, `STAFF`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable)

### `VisitNote` Table
Medical notes recorded during a visit (append-only).
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `appointmentId` (FK → Appointment)
- `patientId` (FK → Patient)
- `staffId` (FK → Staff) — the doctor who wrote the note
- `subjective` (Text, nullable) — patient's complaints
- `objective` (Text, nullable) — exam findings
- `assessment` (Text, nullable) — diagnosis
- `plan` (Text, nullable) — treatment plan
- `prescriptions` (JSON, nullable) — array of `{ medication, dosage, frequency, duration }`
- `isAmendment` (Boolean, default `false`)
- `amendsNoteId` (FK → VisitNote, nullable) — if this is an amendment, reference original
- `createdAt` (DateTime) — immutable, notes cannot be updated

### `Document` Table
File uploads associated with a patient.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `patientId` (FK → Patient)
- `staffId` (FK → Staff) — who uploaded it
- `fileName` (String)
- `fileType` (String) — MIME type
- `fileSize` (Int) — bytes
- `storageUrl` (String) — Supabase Storage URL
- `category` (Enum: `LAB_RESULT`, `IMAGING`, `REFERRAL`, `PRESCRIPTION`, `OTHER`)
- `description` (String, nullable)
- `createdAt` (DateTime)

### `Invoice` Table
Billing records.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `patientId` (FK → Patient)
- `appointmentId` (FK → Appointment, nullable)
- `invoiceNumber` (String, Unique) — auto-generated: `INV-2026-00001`
- `status` (Enum: `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `VOID`, `REFUNDED`)
- `currency` (Enum: `USD`, `PHP`)
- `subtotal` (Decimal)
- `tax` (Decimal, default `0`)
- `total` (Decimal)
- `paidAmount` (Decimal, default `0`)
- `paymentMethod` (Enum: `CASH`, `CARD`, `BANK_TRANSFER`, `GCASH`, `MAYA`, `STRIPE`, nullable)
- `stripePaymentIntentId` (String, nullable)
- `stripeCheckoutUrl` (String, nullable)
- `paidAt` (DateTime, nullable)
- `dueDate` (DateTime)
- `sentAt` (DateTime, nullable)
- `notes` (String, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### `InvoiceItem` Table
Line items on an invoice.
- `id` (UUID, PK)
- `invoiceId` (FK → Invoice)
- `description` (String) — e.g., "General Consultation"
- `quantity` (Int, default `1`)
- `unitPrice` (Decimal)
- `total` (Decimal) — computed: `quantity * unitPrice`

### `Notification` Table
Log of all sent notifications (idempotency + audit).
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `appointmentId` (FK → Appointment, nullable)
- `patientId` (FK → Patient, nullable)
- `type` (Enum: `BOOKING_CONFIRMATION`, `REMINDER_24H`, `REMINDER_1H`, `NO_SHOW_FOLLOWUP`, `INVOICE_SENT`, `PAYMENT_CONFIRMATION`, `FOLLOWUP_REMINDER`)
- `channel` (Enum: `EMAIL`, `SMS`)
- `recipientEmail` (String, nullable)
- `recipientPhone` (String, nullable)
- `status` (Enum: `SENT`, `FAILED`, `PENDING`)
- `sentAt` (DateTime, nullable)
- `errorMessage` (String, nullable)
- `createdAt` (DateTime)

### `AuditLog` Table
Immutable log of all data mutations.
- `id` (UUID, PK)
- `clinicId` (FK → Clinic)
- `userId` (FK → Staff)
- `action` (Enum: `CREATE`, `UPDATE`, `DELETE`)
- `entity` (String) — table name, e.g., "Patient"
- `entityId` (UUID)
- `changes` (JSON) — `{ before: {}, after: {} }`
- `ipAddress` (String, nullable)
- `userAgent` (String, nullable)
- `createdAt` (DateTime) — immutable

### Entity Relationship Diagram

```
Clinic (1) ──── (N) Staff
Clinic (1) ──── (N) Patient
Clinic (1) ──── (N) Service
Clinic (1) ──── (N) OperatingHours
Clinic (1) ──── (N) Appointment
Clinic (1) ──── (N) Invoice
Clinic (1) ──── (N) AuditLog

Patient (1) ──── (N) Appointment
Patient (1) ──── (N) VisitNote
Patient (1) ──── (N) Document
Patient (1) ──── (N) Invoice

Staff (1) ──── (N) Appointment (as doctor)
Staff (1) ──── (N) VisitNote (as author)

Appointment (1) ──── (0..1) VisitNote
Appointment (1) ──── (0..1) Invoice

Invoice (1) ──── (N) InvoiceItem

VisitNote (0..1) ──── (0..1) VisitNote (amendment chain)
```

---

## 🔐 4. Security Design

### 4.1 Authentication Security

- **Supabase Auth** handles all identity management — Healio never stores passwords
- **JWT tokens** are short-lived (1 hour) with refresh tokens (7 days)
- Backend verifies JWT on every request using Supabase's `getUser()` — never trust the client-decoded token
- **Magic link** emails expire after 10 minutes (configurable in Supabase)
- All auth cookies are `HttpOnly`, `Secure`, `SameSite=Strict`

### 4.2 API Security

| Protection | Implementation |
|---|---|
| **Rate Limiting** | `@upstash/ratelimit` with Upstash Redis (free tier): 100 req/min per IP (general), 10 req/min for auth endpoints, 5 req/min for public booking. Applied in `middleware.ts`. |
| **Input Validation** | Zod schemas on every route handler — reject malformed requests with `NextResponse.json({...}, { status: 400 })` |
| **SQL Injection** | Prisma parameterized queries — never raw SQL concatenation |
| **XSS Prevention** | DOMPurify sanitization on all user-generated HTML (visit notes); CSP headers via `next.config.js` security headers |
| **CSRF Protection** | `SameSite=Strict` cookies + same-origin (no CORS needed since frontend and API are the same Vercel deployment) |
| **CORS** | Not needed in production (same-origin). For local dev, Next.js handles this natively. |
| **Security Headers** | Configured in `next.config.js` → `headers()`: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy` |

### 4.3 Data Security

- **Encryption at rest:** PostgreSQL on Supabase/Railway encrypts all data at rest (AES-256)
- **Encryption in transit:** TLS 1.2+ enforced on all connections (HTTPS-only)
- **Sensitive fields:** Patient `dateOfBirth`, `phone`, `allergies` should be encrypted at the application level using `aes-256-gcm` before writing to the DB (envelope encryption pattern)
- **Environment variables:** All secrets (Supabase URL/key, Stripe key, Resend key) in `.env` files, **never** committed to Git. `.env.example` included with placeholder values.
- **Supabase Storage:** Files stored with private bucket policies — accessible only via signed URLs (1-hour expiry)

### 4.4 File Upload Security

- **Allowed MIME types:** `application/pdf`, `image/jpeg`, `image/png` only
- **Max file size:** 10MB per file
- **Virus scanning:** Validate file magic bytes server-side (don't trust `Content-Type` header)
- **Filename sanitization:** Strip all special characters, generate UUID-based filenames

### 4.5 Stripe Webhook Security

- Verify webhook signatures using `stripe.webhooks.constructEvent(body, sig, endpointSecret)`
- Reject any request with invalid or missing signature
- Process webhooks idempotently — check if event was already handled

---

## 🎨 5. Frontend Design Guidelines

### 5.1 Design System

Healio follows a **modern light-themed** design system, inspired by the user's preference.

| Token | Value |
|---|---|
| **Background** | `slate-50` (#F8FAFC) |
| **Card / Surface** | `white` (#FFFFFF) with `shadow-sm` |
| **Primary Accent** | `blue-600` (#2563EB) |
| **Primary Hover** | `blue-700` (#1D4ED8) |
| **Success** | `emerald-500` (#10B981) |
| **Warning** | `amber-500` (#F59E0B) |
| **Danger** | `red-500` (#EF4444) |
| **Text Primary** | `slate-900` (#0F172A) |
| **Text Secondary** | `slate-500` (#64748B) |
| **Border** | `slate-200` (#E2E8F0) |
| **Font Family** | `Inter` (Google Fonts) |
| **Border Radius** | `rounded-xl` (cards), `rounded-lg` (buttons/inputs) |

### 5.2 Layout Principles

- **Sidebar navigation** (collapsible) on desktop; bottom tab bar on mobile
- **Max content width:** `max-w-7xl` with `mx-auto` centering
- **Card-based layout:** All content sections wrapped in white cards with subtle shadow
- **Consistent spacing:** `p-6` card padding, `gap-6` between cards, `space-y-4` for form fields
- **Responsive breakpoints:** `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

### 5.3 Component Standards

- **Buttons:** All buttons have `min-h-[44px]` for touch targets; primary = filled blue, secondary = outlined, danger = red
- **Forms:** Labels above inputs, error messages in red below the field, inline validation on blur
- **Tables:** Striped rows (`even:bg-slate-50`), sticky header, horizontal scroll on mobile
- **Modals/Drawers:** Overlay with `bg-black/40` backdrop; close on escape + click outside
- **Loading States:** Skeleton loaders (not spinners) for initial data fetch; subtle pulse animation
- **Empty States:** Illustration + clear CTA ("No appointments today. Create one?")
- **Toast Notifications:** Bottom-right, auto-dismiss after 5 seconds, stacked

### 5.4 Accessibility

- All interactive elements have visible focus rings (`ring-2 ring-blue-500 ring-offset-2`)
- Minimum color contrast ratio: 4.5:1 (WCAG AA)
- All images have `alt` text
- Form inputs have associated `<label>` elements
- Keyboard navigable: entire app usable with Tab, Enter, Escape

---

## ⚙️ 6. System Design

### 6.1 Performance Targets

| Metric | Target |
|---|---|
| **API response time (p95)** | < 200ms |
| **Page load (LCP)** | < 2.5s |
| **Time to Interactive** | < 3.5s |
| **Database query time (p95)** | < 50ms |
| **Uptime SLA** | 99.9% |

### 6.2 Caching Strategy

- **API-level:** In-memory cache (node-cache) for read-heavy endpoints (analytics, service lists) — 5-minute TTL
- **Frontend:** React Query with `staleTime: 30_000` for appointment lists; `staleTime: 300_000` for settings/services
- **Static assets:** Vercel edge CDN with immutable caching for JS/CSS bundles

### 6.3 Error Handling

- **API Routes:** Each route handler wrapped in a `tryCatch()` utility that catches all unhandled errors → logs to Pino → returns safe 500 generic message via `NextResponse.json()` (never leak stack traces)
- **Next.js Error Pages:** Custom `error.tsx` and `not-found.tsx` for frontend error states
- **Frontend:** React Error Boundaries per page section → show friendly fallback UI
- **API errors:** Consistent error response: `{ success: false, error: { code: "VALIDATION_ERROR", message: "...", details: [...] } }`
- **Sentry** (free tier) for error tracking and alerting in production — integrates with `@sentry/nextjs`

### 6.4 Logging & Monitoring

- **Structured logging** with Pino (JSON format): `{ timestamp, level, requestId, clinicId, userId, method, path, statusCode, duration }`
- **Request tracing:** Every request gets a UUID (`X-Request-Id` header) that flows through all log entries
- **Health check endpoint:** `GET /api/v1/health` → returns `{ status: "ok", db: "connected" }`
- **Vercel Analytics** (free) for Web Vitals + function execution monitoring
- **Uptime monitoring:** UptimeRobot (free) pinging the health endpoint every 5 minutes

### 6.5 Scalability Path

```
MVP (Month 1–3)                  Scale (Month 4–12)
────────────────                 ──────────────────
Vercel serverless funcs  →       Vercel Pro (longer timeout, more concurrency)
Vercel Cron Jobs         →       Inngest or Trigger.dev for complex workflows
In-memory cache          →       Upstash Redis (free tier → paid)
Supabase free tier DB    →       Supabase Pro or managed PostgreSQL
Vercel hobby plan        →       Vercel Pro
```

---

## 🚀 7. Deployment & DevOps

### 7.1 Deployment Model — Single Vercel Project

Since the entire app (frontend + API + cron jobs) is a single Next.js project, deployment is as simple as pushing to `main`. **Vercel handles everything:**

- **Frontend pages** → Edge-optimized static/SSR pages
- **API routes** (`app/api/`) → Serverless functions (auto-scaled)
- **Cron jobs** (`app/api/cron/`) → Vercel Cron (defined in `vercel.json`)
- **Middleware** (`middleware.ts`) → Runs at the edge (auth, rate limiting)

### 7.2 Environment Setup

| Environment | Purpose | URL |
|---|---|---|
| `development` | Local dev | `localhost:3000` (entire app) |
| `preview` | PR previews (auto-generated by Vercel) | `pr-<number>.healio.vercel.app` |
| `staging` | Pre-production testing | `staging.healio.app` |
| `production` | Live users | `healio.app` |

### 7.3 CI/CD Pipeline

```
Push to main (or PR)
    │
    ▼
GitHub Actions
    ├── Lint (ESLint + Prettier)
    ├── Type-check (TypeScript)
    ├── Unit Tests (Vitest)
    ├── Integration Tests (Vitest + PostgreSQL test container)
    └── Build Check (next build)
         │
         ▼ (all pass)
Vercel Auto-Deploy
    ├── PR branch → Preview deployment (unique URL)
    └── main branch → Production deployment (healio.app)
```

### 7.4 `vercel.json` Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/overdue-invoices",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 7.5 Environment Variables

All environment variables are set in the **Vercel Dashboard** (Settings → Environment Variables) per environment (Production, Preview, Development). Never hardcoded.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (Supabase PostgreSQL connection string)
DATABASE_URL=postgresql://user:pass@host:5432/healio
DIRECT_URL=postgresql://user:pass@host:5432/healio  # Direct connection for migrations

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Resend
RESEND_API_KEY=re_...

# Twilio (optional, SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Vercel Cron Secret (auto-injected by Vercel, used to protect cron endpoints)
CRON_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://healio.app
ENCRYPTION_KEY=<32-byte hex key for patient data encryption>
```

---

## 🧪 8. Testing Strategy

### 8.1 Test Pyramid

| Layer | Tool | Coverage Target | What to Test |
|---|---|---|---|
| **Unit Tests** | Vitest | 80%+ for business logic | Prisma service functions, validation schemas, utility functions |
| **Integration Tests** | Supertest + Vitest | All API endpoints | Full request/response cycle with test database |
| **E2E Tests** | Playwright (free) | Critical user flows | Booking flow, login, create appointment, generate invoice |
| **Manual QA** | Browser testing | Cross-browser | Chrome, Safari, Firefox; mobile responsive |

### 8.2 Critical Test Flows

1. **Patient books an appointment** → receives confirmation email → appointment appears on doctor dashboard
2. **Doctor creates visit note** → note is append-only (cannot edit) → appears in patient timeline
3. **Staff generates invoice** → patient receives email with Stripe link → payment marks invoice as paid
4. **Subscription upgrade** → Stripe Checkout → webhook activates tier → gated features unlocked
5. **Multi-tenant isolation** → Clinic A cannot access Clinic B's patients/appointments (critical security test)

---

## 📋 9. Project Structure

```
healio/
├── app/                             # Next.js 14 App Router (frontend + API)
│   ├── (public)/                    # Public routes (no auth required)
│   │   ├── book/[slug]/             # Patient booking portal
│   │   │   └── page.tsx
│   │   └── pay/[invoiceId]/         # Invoice payment page
│   │       └── page.tsx
│   ├── (auth)/                      # Auth routes
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/                 # Authenticated dashboard (shared layout)
│   │   ├── layout.tsx               # Dashboard shell (sidebar + header)
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx             # Patient list
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Patient profile
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/                         # ========== API ROUTE HANDLERS ==========
│   │   └── v1/
│   │       ├── public/              # Public endpoints (no auth)
│   │       │   └── clinics/
│   │       │       └── [slug]/
│   │       │           ├── route.ts          # GET clinic profile
│   │       │           ├── services/
│   │       │           │   └── route.ts      # GET available services
│   │       │           └── slots/
│   │       │               └── route.ts      # GET open time slots
│   │       ├── appointments/
│   │       │   ├── route.ts                  # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts              # GET, PATCH, DELETE
│   │       ├── patients/
│   │       │   ├── route.ts                  # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET, PATCH
│   │       │       ├── visits/
│   │       │       │   └── route.ts          # GET (list), POST (create)
│   │       │       └── documents/
│   │       │           └── route.ts          # GET (list), POST (upload)
│   │       ├── invoices/
│   │       │   ├── route.ts                  # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET, PATCH
│   │       │       ├── send/
│   │       │       │   └── route.ts          # POST (email invoice)
│   │       │       └── pay-link/
│   │       │           └── route.ts          # POST (generate Stripe link)
│   │       ├── services/
│   │       │   └── route.ts                  # GET, POST
│   │       ├── staff/
│   │       │   └── route.ts                  # GET, POST
│   │       ├── clinics/
│   │       │   └── route.ts                  # GET, PATCH (own clinic)
│   │       ├── analytics/
│   │       │   └── route.ts                  # GET
│   │       ├── webhooks/
│   │       │   └── stripe/
│   │       │       └── route.ts              # POST (Stripe webhook)
│   │       └── health/
│   │           └── route.ts                  # GET health check
│   ├── api/cron/                    # ========== VERCEL CRON JOBS ==========
│   │   ├── reminders/
│   │   │   └── route.ts                      # Appointment reminder dispatcher
│   │   ├── overdue-invoices/
│   │   │   └── route.ts                      # Mark overdue invoices
│   │   └── subscription-check/
│   │       └── route.ts                      # Check failed subscription payments
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Marketing landing page
│   ├── error.tsx                    # Global error page
│   └── not-found.tsx                # 404 page
│
├── components/                      # React components
│   ├── ui/                          # Reusable primitives (Button, Input, Modal, etc.)
│   ├── appointments/                # Appointment-specific components
│   ├── patients/                    # Patient-specific components
│   ├── billing/                     # Billing-specific components
│   └── layout/                      # Sidebar, Header, MobileNav
│
├── lib/                             # Shared logic (frontend + API)
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server-side Supabase client (for API routes)
│   │   └── middleware.ts            # Supabase auth helper for middleware.ts
│   ├── prisma.ts                    # Prisma client singleton
│   ├── api-helpers.ts               # withAuth(), withValidation(), successResponse(), errorResponse()
│   ├── stripe.ts                    # Stripe client init
│   ├── resend.ts                    # Resend client init
│   ├── encryption.ts                # Patient data AES-256-GCM encryption
│   ├── logger.ts                    # Pino logger setup
│   ├── rate-limit.ts                # Upstash rate limiter setup
│   └── utils.ts                     # Formatters, date helpers, ID generators
│
├── services/                        # Business logic layer (used by API routes)
│   ├── appointmentService.ts
│   ├── patientService.ts
│   ├── invoiceService.ts
│   ├── notificationService.ts
│   ├── stripeService.ts
│   └── analyticsService.ts
│
├── schemas/                         # Zod validation schemas
│   ├── appointment.ts
│   ├── patient.ts
│   ├── invoice.ts
│   └── clinic.ts
│
├── emails/                          # React Email templates
│   ├── booking-confirmation.tsx
│   ├── reminder.tsx
│   ├── invoice.tsx
│   └── welcome.tsx
│
├── hooks/                           # Custom React hooks
│   ├── useAppointments.ts
│   ├── usePatients.ts
│   └── useInvoices.ts
│
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── migrations/
│   └── seed.ts                      # Seed data for development
│
├── tests/
│   ├── unit/                        # Vitest unit tests
│   └── integration/                 # API route integration tests
│
├── public/                          # Static assets
├── styles/
│   └── globals.css                  # Tailwind base + custom tokens
│
├── middleware.ts                     # Next.js Edge Middleware (auth, rate limiting)
├── next.config.js                   # Next.js config (security headers, redirects)
├── tailwind.config.ts
├── vercel.json                      # Vercel config (cron jobs)
├── docker-compose.yml               # Local PostgreSQL for dev
├── .env.example
├── .env.local                       # Local dev env vars (git-ignored)
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI/CD
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🗓️ 10. Milestone Plan

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 1: Foundation** | Week 1–2 | Project setup, DB schema, auth flow, basic CRUD APIs |
| **Phase 2: Core Features** | Week 3–5 | Appointment booking, patient records, calendar UI, reminders |
| **Phase 3: Billing** | Week 6–7 | Invoice generation, Stripe integration, payment tracking |
| **Phase 4: Polish** | Week 8–9 | Analytics dashboard, settings, audit log, email templates |
| **Phase 5: Harden** | Week 10 | Security audit, testing, performance optimization, deploy to staging |
| **Phase 6: Launch** | Week 11–12 | Production deploy, monitoring setup, marketing landing page, first users |

---

## 📎 Appendix: Complete Tech Stack Summary

| Category | Technology | Cost |
|---|---|---|
| Framework (full-stack) | Next.js 14 (App Router) — frontend + API routes | Free |
| CSS Framework | Tailwind CSS | Free |
| Language | TypeScript (full-stack) | Free |
| Database | PostgreSQL (Supabase) | Free tier (500MB, 2 projects) |
| ORM | Prisma | Free |
| Authentication | Supabase Auth | Free tier (50K MAU) |
| File Storage | Supabase Storage | Free tier (1GB) |
| Email | Resend + React Email (templates) | Free tier (100 emails/day) |
| SMS | Twilio | Free trial ($15 credit) |
| Payments | Stripe | Pay-as-you-go (2.9% + 30¢) |
| Rate Limiting | @upstash/ratelimit + Upstash Redis | Free tier (10K req/day) |
| Charts | Recharts | Free |
| Rich Text Editor | TipTap | Free (open source) |
| Testing | Vitest + Playwright | Free |
| Logging | Pino | Free |
| Error Tracking | @sentry/nextjs | Free tier (5K errors/mo) |
| Uptime Monitoring | UptimeRobot | Free tier (50 monitors) |
| Hosting (entire app) | Vercel (frontend + API + cron) | Free tier (hobby) |
| Scheduled Jobs | Vercel Cron Jobs | Free (included with Vercel) |
| CI/CD | GitHub Actions + Vercel auto-deploy | Free (2K min/mo) |
| Validation | Zod | Free |
| Security Headers | next.config.js `headers()` | Free (built-in) |
