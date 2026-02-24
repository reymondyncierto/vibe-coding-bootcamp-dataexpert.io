# Supabase Google Auth Setup (Healio)

This guide configures Google sign-in for Healio using Supabase Auth.

Healio auth routes used in this flow:
- `/login`
- `/signup`
- `/auth/callback` (OAuth code exchange + safe redirect)

## 1. Prerequisites

- A Supabase project
- A Google Cloud project you can manage
- Healio running locally (recommended) or a deployed Vercel URL

## 2. Set Healio environment variables

In `healio/.env.local` (local) and in Vercel env vars (production), set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Examples:

- Local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`

## 3. Configure Google OAuth in Google Cloud

1. Open Google Cloud Console.
2. Select or create a project for Healio auth.
3. Go to `APIs & Services` → `OAuth consent screen`.
4. Configure the consent screen:
   - App name (e.g. `Healio`)
   - Support email
   - Authorized domain(s) for production (your domain)
   - Developer contact email
5. Add test users if the app is in testing mode.
6. Go to `APIs & Services` → `Credentials`.
7. Create credentials → `OAuth client ID`.
8. Choose `Web application`.
9. Add at least one Authorized redirect URI (you will also add the Supabase callback URI in step 4):
   - Supabase will provide the exact callback URL to use for Google.
10. Save and copy:
   - Google Client ID
   - Google Client Secret

## 4. Enable Google provider in Supabase

1. Open Supabase Dashboard → your project.
2. Go to `Authentication` → `Providers` → `Google`.
3. Enable the Google provider.
4. Paste the Google Client ID and Client Secret from Google Cloud.
5. Copy the Supabase-generated Google redirect/callback URL shown on this page.
6. Go back to Google Cloud OAuth client settings and add that exact Supabase callback URL to Authorized redirect URIs.
7. Save in both Google Cloud and Supabase.

Notes:
- The Google redirect URI is typically your Supabase auth callback endpoint, not your Healio app URL.
- Healio still uses `/auth/callback` as the app redirect target for Supabase OAuth.

## 5. Configure Supabase redirect URLs for Healio

In Supabase Dashboard → `Authentication` → URL Configuration (labels may vary):

Add site/app URL(s):
- Local site URL: `http://localhost:3000`
- Production site URL: `https://your-domain.vercel.app` (or custom domain)

Add redirect URL allowlist entries:
- `http://localhost:3000/auth/callback`
- `https://your-domain.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback` (if using custom domain)

If you run local dev on a different port (for example `3002`), also add:
- `http://localhost:3002/auth/callback`

## 6. Verify Healio app flow

1. Start Healio:
   ```bash
   cd healio
   npm install
   npm run dev
   ```
2. Open `http://localhost:3000/login`.
3. Click `Continue with Google`.
4. Complete Google sign-in.
5. Confirm you return through `/auth/callback` and land on the safe `next` path (default `/settings`).

Signup page note:
- `/signup` now also exposes `Continue with Google` for OAuth entry.
- Clinic provisioning in Healio is a separate onboarding flow (`/api/auth/provision`) and may still be completed after auth depending on your setup.

## 7. Vercel production setup

1. In Vercel Project → `Settings` → `Environment Variables`, add the Supabase env vars and `NEXT_PUBLIC_APP_URL`.
2. Ensure the Vercel project root directory is `healio`.
3. Redeploy after updating env vars.
4. Add the production `/auth/callback` URL to Supabase redirect URLs.

## 8. Troubleshooting

### `supabase_not_configured` or `Supabase auth unavailable`
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart the Next.js dev server after env changes

### Google error: redirect URI mismatch
- The Google OAuth client is missing the exact Supabase callback URL shown in Supabase Google provider settings
- Compare the full URL exactly (scheme, subdomain, path)

### Redirect returns to login with `exchange_failed`
- Confirm Supabase provider credentials are correct
- Confirm `/auth/callback` is allowlisted in Supabase redirect URLs
- Confirm the app URL/port matches your local environment (`3000` vs `3002`)

### User signs in but app routing is wrong
- Check the `next` query value passed to `/login` or `/signup`
- Healio only accepts safe relative paths (no external URLs)
