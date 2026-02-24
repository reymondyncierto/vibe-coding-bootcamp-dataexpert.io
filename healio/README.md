# Healio

Healio is a clinic management SaaS built as a unified Next.js monolith (UI, API routes, auth callbacks, webhooks, and cron endpoints in one app). It is designed for small clinics and solo practitioners with fast in-context workflows for booking, patients, appointments, billing, and operations.

## What The App Does

- Public booking portal (`/book/[slug]`)
- Staff-facing appointment views (`/appointments`)
- Patient directory and chart (`/patients`, `/patients/[id]`)
- Billing dashboard + invoice flows (`/billing`, `/pay/[invoiceId]`)
- Analytics dashboard (`/analytics`)
- Settings (clinic profile, services, staff, billing, audit logs) (`/settings`)
- Auth onboarding/login flows (`/login`, `/signup`, `/auth/callback`)

## Architecture (Current Implementation)

- `app/`: Next.js App Router pages and route handlers
  - Route groups: `(public)`, `(auth)`, `(dashboard)`
  - APIs: `app/api/v1/*`, cron routes `app/api/cron/*`, auth provisioning `app/api/auth/provision`
- `components/`: UI primitives and feature components (appointments, patients, billing, settings, analytics)
- `services/`: Business logic layer (booking, invoices, notifications, analytics, audit, subscriptions, etc.)
- `schemas/`: Zod validation and API contracts
- `lib/`: Shared helpers (env, logging, Stripe, Supabase, Twilio/Resend adapters, caching, query client)
- `prisma/`: Prisma schema, migration SQL, seed script
- `tests/`: unit, integration, and E2E (Playwright) tests
- `.status/`: task execution tracking (all tasks now marked `DONE_*.xml`)

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Prisma (schema + migration artifacts)
- Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`)
- Stripe (checkout + webhook reconciliation)
- Resend (email) and Twilio (SMS) adapters with local fallbacks
- React Query (`@tanstack/react-query`)
- Vitest + Node test runner + Playwright
- Pino logging

## Quick Start (Local)

### Prerequisites

- Node.js 20+ (project has been run on newer versions too)
- npm
- PostgreSQL (or use Docker Compose)
- Optional for E2E: Playwright browser binaries (`npx playwright install`)

### 1. Configure environment

```bash
cd healio
cp .env.example .env.local
```

Fill `.env.local` with real values where available. For local development, placeholder values are fine for some providers because parts of the app have safe fallbacks (Stripe/Resend/Twilio adapters), but build/runtime env validation still expects the required keys to exist.

### 2. Install dependencies

```bash
npm install
```

### 3. Database / Prisma (local)

If you have Postgres running locally:

```bash
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate dev --schema prisma/schema.prisma
npm run db:seed
```

If you only want schema checks:

```bash
npm run prisma:validate
```

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Docker (Local App + Postgres)

```bash
cd healio
cp .env.example .env.local
docker compose up --build
```

Notes:
- `docker-compose.yml` runs Next.js and Postgres.
- Compose overrides `DATABASE_URL`/`DIRECT_URL` to point to the `db` container.

## Environment Variables (What To Set)

See `.env.example` for the full list. The most important variables are grouped below.

### Required (app boot, API, auth, billing, cron)

- Supabase
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Database
  - `DATABASE_URL`
  - `DIRECT_URL`
- Billing
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Email + cron
  - `RESEND_API_KEY`
  - `CRON_SECRET`
- App + security
  - `NEXT_PUBLIC_APP_URL`
  - `ENCRYPTION_KEY` (must be a 64-char hex string)

### Optional / Recommended

- Twilio SMS
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
- Upstash Redis (future/production rate limit backing)
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Observability
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`
  - `UPTIMEROBOT_HEALTHCHECK_URL`

## Third-Party Integration Setup

## Supabase (Auth)

Healio uses Supabase for authentication and reads custom claims (`clinicId`, `role`) from user metadata/app metadata.

### Supabase setup steps

1. Create a Supabase project.
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`
3. Configure auth providers (email/password and/or email OTP; Google OAuth optional).
4. Add redirect URLs in Supabase Auth settings:
   - `http://localhost:3000/auth/callback`
   - `https://<your-domain>/auth/callback`
5. Ensure your user records include:
   - `clinicId`
   - `role` (`OWNER`, `DOCTOR`, or `RECEPTIONIST`)

Detailed setup (primary: email/password auth):
- `healio/docs/supabase-email-password-auth-setup.md`

Optional Google OAuth setup:
- `healio/docs/supabase-google-auth-setup.md`

Notes:
- Login/signup pages support local-safe provisioning previews even if Supabase is not fully configured.
- `app/auth/callback/route.ts` handles auth code exchange and safe redirecting.

## Stripe (Payments + Webhooks)

Healio supports invoice pay-link generation and Stripe webhook reconciliation.

### Stripe setup steps

1. Create a Stripe account and get:
   - Secret key → `STRIPE_SECRET_KEY`
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Configure a webhook endpoint:
   - Local (with Stripe CLI): `http://localhost:3000/api/v1/webhooks/stripe`
   - Production: `https://<your-domain>/api/v1/webhooks/stripe`
3. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Local webhook testing (recommended)

```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

Behavior notes:
- If Stripe SDK/key is unavailable, the app uses a safe local fallback pay-link flow for development/testing.
- Webhook signature verification is enforced when `STRIPE_WEBHOOK_SECRET` is set.

## Resend (Email)

Healio uses Resend for transactional emails (invoice sends, reminders, etc.).

### Setup steps

1. Create a Resend account and API key → `RESEND_API_KEY`
2. (Recommended) Configure a verified sender/domain
3. Optional sender override:
   - `RESEND_FROM_EMAIL` (if omitted, local default sender strings may be used in fallback flows)

Behavior notes:
- If Resend SDK/key is unavailable, the adapter returns a local fallback provider result for dev/test coverage.

## Twilio (SMS)

Healio includes a Twilio SMS adapter for reminders/notifications.

### Setup steps

1. Create a Twilio account and get:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
2. Buy/verify a sending number:
   - `TWILIO_FROM_NUMBER`

Behavior notes:
- If Twilio is not configured, SMS delivery uses a fallback provider result so flows can still be exercised locally.

## Vercel (Deployment + Cron)

`vercel.json` defines cron schedules for:
- `/api/cron/reminders?lead=24h`
- `/api/cron/overdue-invoices`
- `/api/cron/subscription-check`

### Required setup

- Set `CRON_SECRET` in Vercel environment variables.
- Ensure all required env vars are present in **Preview** and **Production**.

Cron auth notes:
- Cron routes accept `Authorization: Bearer <CRON_SECRET>` (Vercel-compatible) or `x-cron-secret`.

### Vercel Hobby plan note (important)

Vercel Hobby only supports cron jobs that run at most once per day. This repo is patched to a Hobby-safe `vercel.json` (daily jobs only).

- Included on Hobby:
  - `24h` reminders (daily)
  - overdue invoice sweep (daily)
  - subscription check (daily)
- Not included on Hobby:
  - `1h` reminder cron (`/api/cron/reminders?lead=1h`)

If you need hourly reminders on Hobby, use an external scheduler (GitHub Actions cron, cron-job.org, EasyCron, etc.) and call:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://your-domain.vercel.app/api/cron/reminders?lead=1h"
```

Upgrade to Vercel Pro if you want Vercel-managed hourly cron schedules.

## Sentry / Observability (Optional Baseline)

- `sentry.server.config.ts` and `sentry.client.config.ts` are included as lightweight config helpers.
- They do not initialize `@sentry/nextjs` yet.
- Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` before wiring the SDK.

## Running Tests

### Typecheck / build

```bash
npm run typecheck
npm run build
```

### Unit + integration

```bash
npm run test:unit
npm run test:integration
```

### E2E (Playwright)

```bash
npx playwright install
npm run e2e:list
npm run e2e
```

The current E2E setup includes a public booking flow spec with mocked API responses.

## Helpful Local Routes

- Public booking: `http://localhost:3000/book/northview-clinic`
- Billing dashboard: `http://localhost:3000/billing`
- Patients: `http://localhost:3000/patients`
- Appointments: `http://localhost:3000/appointments`
- Analytics: `http://localhost:3000/analytics`
- Settings: `http://localhost:3000/settings`
- Health check: `http://localhost:3000/api/v1/health`

## Local Development Notes

- Many services use in-memory stores/fallbacks for local progress and testability.
- Some protected API routes support a localhost header bypass in non-production for local testing:
  - `x-healio-clinic-id`
  - `x-healio-user-id`
  - `x-healio-role`
- Frontend verification standards are documented in `.status/FRONTEND_VERIFICATION_RULES.xml`.

## Monitoring & Operations Baseline

- Health endpoint: `GET /api/v1/health`
  - Expected: `200` and `{ success: true, data.status: "ok" }`
- Logging:
  - Pino structured JSON logs (`lib/logger.ts`)
  - common secrets/PII paths are redacted
  - health checks emit `healthcheck_observed`
- Recommended alerts:
  - Health endpoint downtime
  - API error-rate spike
  - Cron failures (`/api/cron/*`)
  - Stripe webhook signature failures (`/api/v1/webhooks/stripe`)

## CI / Release

- CI workflow: `healio/.github/workflows/ci.yml`
  - install
  - typecheck
  - unit tests
  - integration tests
  - Playwright discovery smoke (`e2e:list`)
  - build
- Release checklist: `healio/docs/release-checklist.md`

## Troubleshooting

### `next build` fails on auth pages (`/login` / `/signup`)

This repo already includes the fix: auth pages use `Suspense` around `useSearchParams()` consumers to satisfy App Router prerender requirements.

### `npm run typecheck` fails with missing `.next/types/*`

If you ran `typecheck` in parallel with `next build`, `.next/types` can race while Next regenerates files. Rerun sequentially:

```bash
npm run build
npm run typecheck
```

### Provider integrations not configured locally

- Stripe, Resend, and Twilio adapters have fallback behavior for local testing.
- Still set placeholder env vars for required keys so env validation/builds do not fail.
