# Healio

Healio is a clinic management SaaS planned as a unified Next.js monolith (frontend, API routes, and cron jobs in one project). The implementation roadmap and architecture live in `prd.md`, and execution tasks live in `.status/`.

## Local Setup (Early Scaffold)

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

## Notes

- SMS (Twilio) and Upstash Redis values are optional during initial local development but required for their production features.
- Frontend task verification follows `.status/FRONTEND_VERIFICATION_RULES.xml` (Chrome DevTools MCP evidence).
