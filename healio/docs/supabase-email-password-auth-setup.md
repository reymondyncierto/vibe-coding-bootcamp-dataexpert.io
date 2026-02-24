# Supabase Email/Password Auth Setup (Healio)

This guide configures standard email/password authentication for Healio using Supabase Auth.

Healio routes involved:
- `/login` (email/password + magic link)
- `/signup` (clinic provisioning + email/password account creation)
- `/auth/callback` (used for magic-link and email-confirmation redirects when enabled)

## 1. Prerequisites

- A Supabase project
- Healio app code (`healio/`)
- A local URL (for example `http://localhost:3000`) and/or a deployed Vercel URL

## 2. Set Healio environment variables

Add these to `healio/.env.local` (local) and Vercel environment variables (production):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Examples:
- Local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`

## 3. Configure Supabase Auth (Email provider)

1. Open Supabase Dashboard → your project.
2. Go to `Authentication` → `Providers`.
3. Ensure `Email` provider is enabled.
4. Choose your desired mode:
   - Email/password login enabled (standard username/password flow)
   - Optional email confirmation enabled (recommended for production)
5. Save provider settings.

Notes:
- Healio supports both email/password and magic-link on the auth pages.
- If email confirmation is enabled, users may need to verify email before login completes.

## 4. Configure Supabase URL settings (important)

Open Supabase Dashboard → `Authentication` → URL Configuration (labels may vary).

Set Site URL(s):
- Local: `http://localhost:3000`
- Production: `https://your-domain.vercel.app` (or custom domain)

Add redirect URL allowlist entries:
- `http://localhost:3000/auth/callback`
- `https://your-domain.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback` (if applicable)

If you run local dev on a different port, add that exact callback URL too (example):
- `http://localhost:3002/auth/callback`

## 5. Run Healio locally

```bash
cd healio
npm install
npm run dev
```

Open:
- `http://localhost:3000/login`
- `http://localhost:3000/signup`

## 6. Test the email/password flow

### Login (`/login`)
1. Enter email and password.
2. Click `Sign In with Password`.
3. On success, Healio redirects to the safe `next` path (default `/settings`).

### Signup (`/signup`)
1. Fill clinic provisioning details.
2. Enter password and confirm password.
3. Click `Create Email + Password Login` to create the Supabase account.
4. Click `Create Account & Provision Clinic` to provision the Healio clinic workspace (if not already provisioned).

Notes:
- The provisioning flow (`/api/auth/provision`) is separate from Supabase account creation.
- You can provision first or create the auth account first depending on your onboarding flow.

## 7. Vercel production setup

1. In Vercel Project → `Settings` → `Environment Variables`, add the Supabase env vars and `NEXT_PUBLIC_APP_URL`.
2. Ensure Vercel Root Directory is `healio`.
3. Redeploy after env changes.
4. Add your production `/auth/callback` URL to Supabase redirect URLs.

## 8. Troubleshooting

### "Supabase auth unavailable"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart Next.js after changing env vars

### Password sign-in fails for a newly created account
- If email confirmation is enabled, verify the user email first
- Check Supabase Auth user status in Dashboard → Authentication → Users

### Signup says passwords do not match
- Re-enter both password fields exactly
- Healio validates password confirmation before calling Supabase

### Redirect behavior is wrong after auth
- Check the `next` query parameter (`/login?next=/settings`)
- Healio only allows safe relative paths for redirects
