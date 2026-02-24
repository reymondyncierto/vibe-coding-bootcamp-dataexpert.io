# Healio Release Readiness Checklist

## Pre-Deploy Gates

- `npm ci`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run e2e:list` (or full Playwright run when CI environment supports browser execution)
- `npm run build`

## Environment & Secrets

- Confirm required production env vars are set:
  - Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
  - Database (`DATABASE_URL`, `DIRECT_URL`)
  - Encryption (`ENCRYPTION_KEY`, 64-char hex)
  - Billing (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Cron/webhooks (`CRON_SECRET`)
- Optional but recommended:
  - `RESEND_API_KEY`, `TWILIO_*`
  - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`

## Platform & Operations

- Deploy `vercel.json` cron schedules and verify `CRON_SECRET` exists in the target environment.
- Confirm webhook endpoint `/api/v1/webhooks/stripe` is reachable and secret matches Stripe dashboard.
- Run health check: `GET /api/v1/health` returns `200` and `data.status = "ok"`.
- Verify logging pipeline receives structured JSON and redacted sensitive fields.

## Product Smoke Checks (Manual)

- Public booking: service selection, slot selection, patient drawer submit, confirmation state
- Staff dashboard: appointments day/week views, quick actions drawer, mobile nav
- Billing: invoice list loads, create/edit drawer opens, public pay page loads
- Settings: clinic profile/services/staff/billing/audit cards load with empty/error states

## Performance Baseline

- Validate bundle/build output after `npm run build` (no unexpected dynamic route regressions).
- Confirm React Query defaults are tuned for production:
  - stale time >= 2 minutes for dashboard fetches
  - window-focus refetch disabled
- Confirm analytics cache TTL is set appropriately (`HEALIO_ANALYTICS_CACHE_TTL_MS`) for traffic profile.
- Check first-load and route interaction on mobile using Chrome DevTools (CPU/network throttling if needed).

## Release / Rollback Notes

- Tag the release commit after deployment verification.
- Keep the prior deployment ready for rollback until cron + webhook + billing smoke checks pass.
- If rollback is required, re-verify Stripe webhook secret and cron environment values in the restored deployment.
