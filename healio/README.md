# Healio

Healio is a clinic management SaaS planned as a unified Next.js monolith (frontend, API routes, and cron jobs in one project). The implementation roadmap and architecture live in `prd.md`, and execution tasks live in `.status/`.

## Local Setup

1. Copy env vars:
   - `cp .env.example .env.local`
2. Fill required values for:
   - Supabase
   - PostgreSQL (`DATABASE_URL`, `DIRECT_URL`)
   - Stripe
   - Resend
   - `CRON_SECRET`
   - `ENCRYPTION_KEY` (64-char hex string)
3. Install dependencies and run:
   - `npm install`
   - `npm run dev`
4. Optional: start with Docker (app + Postgres):
   - `cp .env.example .env.local`
   - `docker compose up --build`

## Notes

- SMS (Twilio) and Upstash Redis values are optional during initial local development but required for their production features.
- Frontend task verification follows `.status/FRONTEND_VERIFICATION_RULES.xml` (Chrome DevTools MCP evidence).

## Deployment / Cron Setup (Vercel)

- `vercel.json` includes cron schedules for:
  - `/api/cron/reminders?lead=24h`
  - `/api/cron/reminders?lead=1h`
  - `/api/cron/overdue-invoices`
  - `/api/cron/subscription-check`
- Set `CRON_SECRET` in Vercel project environment variables. Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`, which matches the route authorization checks.
- Keep Stripe, Supabase, and database variables set in all runtime environments (`Preview` and `Production`) to avoid build/runtime validation failures.

## Environment Checklist (Minimum)

- Required for boot/login/API: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Required for data + encryption: `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_KEY`
- Required for billing flows: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Required for cron routes: `CRON_SECRET`
- Optional but recommended: `RESEND_API_KEY`, `TWILIO_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
