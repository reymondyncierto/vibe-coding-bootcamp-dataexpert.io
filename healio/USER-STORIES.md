# Healio User Stories (Step-by-Step)

This guide is a detailed manual QA / UAT walkthrough for the current Healio build.

It covers:
- Creating a clinic account
- Logging in (email/password, magic link, Google)
- Configuring clinic settings
- Public booking
- Checking appointments and updating statuses
- Working with patient records and notes/documents
- Billing, invoice generation, and payment links

## Before You Start

### Local environment (recommended for testing)
1. Open a terminal.
2. Start the app:
   ```bash
   cd healio
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`.

### Auth setup (important)
- For real auth flows, configure Supabase first:
  - `healio/docs/supabase-email-password-auth-setup.md`
  - Optional Google OAuth: `healio/docs/supabase-google-auth-setup.md`
- If Supabase is not configured, some auth actions will show provider errors, but local preview/provisioning actions may still work.

### Demo clinic slug (local)
- Local fallback/demo booking slug is usually:
  - `/book/northview-clinic`

## Story 1: Clinic Owner Creates a Clinic Account (Signup)

### Goal
Create a clinic workspace and create a login credential for the owner.

### Steps
1. Go to `http://localhost:3000/signup`.
2. In the signup form, fill these fields:
   - `Owner name`
   - `Owner email`
   - `Password`
   - `Confirm password`
   - `Clinic name`
   - `Booking slug`
   - `Timezone`
   - `Currency`
3. Click `Create Email + Password Login`.
4. Expected result:
   - A success message appears (or Supabase email confirmation prompt if enabled).
5. Click `Create Account & Provision Clinic`.
6. Expected result:
   - A provisioning success panel appears with:
     - clinic name
     - clinic ID
     - booking slug
     - recommended next steps
   - Buttons shown include `Continue to Settings Onboarding` and `Open Login`.
7. Click `Continue to Settings Onboarding`.

### Alternate options on the same page
- `Send Magic Link (Optional)` sends a Supabase auth email.
- `Continue with Google` starts Supabase Google OAuth (if configured).
- `Back to Login` returns to `/login`.

### Notes
- Provisioning (`/api/auth/provision`) and auth account creation are separate flows.
- If Supabase email is rate-limited, you may see provider errors on magic link / signup email actions.

## Story 2: Clinic Owner Logs In

### Goal
Sign in and reach the authenticated workspace.

### Steps (Email + Password)
1. Go to `http://localhost:3000/login`.
2. Enter `Work email`.
3. Enter `Password`.
4. Click `Sign In with Password`.
5. Expected result:
   - Success message appears briefly.
   - Browser redirects to the `next` path (default `/settings`).

### Steps (Magic Link)
1. On `/login`, enter `Work email`.
2. Click `Send Magic Link`.
3. Expected result:
   - Success message says Supabase will redirect via `/auth/callback` after email verification.
4. Open the email and complete sign-in.

### Steps (Google OAuth)
1. On `/login`, click `Continue with Google`.
2. Complete Google sign-in.
3. Expected result:
   - Redirect returns through `/auth/callback`.
   - User lands on the safe `next` path.

### Troubleshooting
- If you see `over_email_send_rate_limit`, Supabase has throttled auth emails (magic link / signup confirmation). Wait and retry or use password/Google.

## Story 3: Configure Clinic Settings (Profile, Hours, Preferences)

### Goal
Review and edit clinic configuration using the settings workspace and drawers.

### Steps
1. Go to `http://localhost:3000/settings` (or use login redirect).
2. Confirm page header shows `Settings Workspace`.
3. In the `Clinic Profile` card:
   - Click `Refresh` (optional)
   - Click `Edit Profile`
4. Expected result:
   - A drawer opens titled `Edit Clinic Profile`
   - Editable fields appear (name, email, phone, address, timezone, currency)
5. Click `Cancel` to close, or `Save Draft` to test the drawer shell.

6. In the `Operating Hours` card:
   - Click `Edit Hours`
7. Expected result:
   - Drawer opens with rows for each day (`Sun` to `Sat`) and time inputs.
8. Click `Cancel` or `Save Draft`.

9. In the `Notification Preferences` card:
   - Click `Edit Preferences`
10. Expected result:
   - Drawer opens with checkbox rows (reminders, invoice email sends, staff invites)
11. Toggle a checkbox, then click `Save Draft`.

### Notes
- These drawers are UX shells for in-context editing and may not persist all changes yet.
- The action buttons (`Edit Profile`, `Edit Hours`, `Edit Preferences`) are intentionally responsive and full-width on mobile.

## Story 4: Patient Books an Appointment (Public Booking)

### Goal
A patient books through the public booking page and receives a confirmation + `.ics` calendar file.

### Steps
1. Open the public booking page:
   - `http://localhost:3000/book/northview-clinic`
2. In `1. Choose a service`:
   - Click a service card (for example a consultation service).
3. Expected result:
   - Service card becomes selected
   - Progress step updates
4. In `2. Choose a provider`:
   - Click `Any available clinician` (the `Choose a specific clinician` option is marked `Soon`).
5. In `3. Pick a time`:
   - Use the `Appointment date` field to choose a date
   - Click an available slot button in the slot grid
6. Expected result:
   - `Booking summary` updates with clinic, service, date, and selected time
   - A message appears indicating the step flow is ready
7. Click `Continue to patient details` (in the `Booking summary` card; it becomes enabled after a slot is selected).
8. In the `Patient details` drawer, fill:
   - `First name`
   - `Last name`
   - `Email`
   - `Phone`
   - `Notes (optional)`
9. Click `Confirm booking`.
10. Expected result:
   - Success toast / confirmation state appears
   - `Appointment confirmed` card is shown
   - `Booking ID` and `Appointment ID` are visible
11. Click `Download .ics`.
12. Expected result:
   - Calendar file downloads
13. Optional: click `Book another appointment` to reset the slot confirmation state.

## Story 5: Front Desk Checks Appointments (Day View + Week View)

### Goal
Review the schedule, load demo data, and update appointment statuses from the drawer.

### Steps
1. Go to `http://localhost:3000/appointments`.
2. Confirm the top tabs show:
   - `Day View`
   - `Week View`
3. Stay on `Day View`.
4. In the `Daily Schedule` controls, check these actions:
   - `Date`
   - `Status`
   - `Refresh`
   - `Load Demo Day`
5. Click `Load Demo Day`.
6. Expected result:
   - Timeline entries appear in the `Timeline` card
   - Summary metric cards populate (`Appointments`, `Checked In`, `Completed`, `No-Show Watch`)
7. Click any appointment row in the `Timeline`.
8. Expected result:
   - `Appointment details` drawer opens
9. In the drawer, use status actions (labels vary by current status), such as:
   - `Complete Visit`
   - `Mark No Show`
   - `Cancel Appointment` (requires reason)
10. Optional: edit notes and use quick actions (save notes / delete appointment).
11. Close the drawer.

### Week view
1. Click `Week View`.
2. Use:
   - `Previous Week`
   - `This Week`
   - `Next Week`
3. Expected result:
   - Weekly columns update and show appointments grouped by day.

## Story 6: Front Desk Reviews Patients and Opens a Chart

### Goal
Search patient records, review risk indicators, and open a patient chart.

### Steps
1. Go to `http://localhost:3000/patients`.
2. Confirm header shows `Patients` and summary cards (`Visible`, `Upcoming`, `Attendance risk`).
3. Use `Search patients` to filter results.
4. Optional quick actions:
   - Click `All Patients`
   - Click `Quick Search: Santos`
5. In `Patient Directory`, review rows showing:
   - patient name
   - attendance risk badge
   - phone/email
   - last visit / upcoming / no-show / late cancel
6. Use pagination buttons if available:
   - `Previous`
   - `Next`
7. Open a chart:
   - If `Open Chart` is wired in your current build, click `Open Chart` on a patient row.
   - If not, manually navigate using a known patient ID route (for example from API/dev data) to `/patients/<patientId>`.

### Expected result
- Patient chart page loads with:
  - `Patient Chart` header card
  - `Edit Patient (Drawer)` button
  - `Add Appointment` button
  - tab strip: `Overview`, `Visits`, `Documents`, `Billing`

## Story 7: Clinician / Staff Uses Patient Chart Tabs (Notes, Documents, Billing)

### Goal
Work in a patient chart without losing context.

### Steps
1. From a patient chart (`/patients/<patientId>`), click `Visits` tab.
2. Expected result:
   - Visit/SOAP area loads with note timeline and note actions.
3. Click `New SOAP Note` (or `Create First SOAP Note` when empty).
4. Fill SOAP note fields in the drawer/editor and save.
5. Expected result:
   - SOAP note appears in the timeline
   - Amendments remain append-only (where supported)

### Documents tab
1. Click `Documents` tab.
2. Click `Upload Document` (or `Upload First Document`).
3. In the drawer, choose a file and submit.
4. Expected result:
   - Document appears in the list with metadata (type/size/uploaded time)
5. Click `Preview` on a document.
6. Expected result:
   - Preview modal opens (or local-mode fallback preview message appears)

### Billing tab (patient context)
1. Click `Billing` tab.
2. Expected result:
   - Related invoices for that patient are listed in-context.

## Story 8: Front Desk Creates and Edits an Invoice (Billing Dashboard)

### Goal
Create an invoice from the billing dashboard and manage invoice records in-context.

### Steps
1. Go to `http://localhost:3000/billing`.
2. Confirm page header shows `Billing Dashboard` and top actions:
   - `Refresh Data`
   - `Create Invoice`
3. Click `Create Invoice`.
4. Expected result:
   - Invoice drawer opens (`Create Invoice`)
5. Fill invoice fields/line items and submit (`Create Invoice`).
6. Expected result:
   - Invoice appears in the `Invoices` list
   - Summary cards update (depending on data/filter)
7. In the `Invoices` card, use filters:
   - `Search invoices`
   - status dropdown (`All Statuses`, `Draft`, `Sent`, etc.)
8. Click `Edit` on an invoice row.
9. Expected result:
   - Drawer opens in edit mode (`Edit Invoice`)
10. Save changes.

### Notes
- `InvoiceList` also includes a `New Invoice` button in the list header when the create action is available.

## Story 9: Send Invoice Email and Open Public Payment Page

### Goal
Send an invoice to a patient by email and verify the patient payment page flow.

### Preconditions
- Invoice exists for a patient with an email address.
- Stripe/Resend may be configured or the app may use local fallback behaviors.

### Steps (staff side)
1. From billing/invoice workflows, use the invoice send action (API-backed send route: `/api/v1/invoices/[id]/send`).
2. Expected result:
   - Invoice email send succeeds or returns a clear error.

### If email fails
- Common auth-email error from Supabase: `over_email_send_rate_limit` (auth emails only, not invoice email provider itself).
- Invoice email sending uses the Resend adapter and may return a Healio wrapper error such as `NOTIFICATION_DELIVERY_FAILED` if delivery fails.

### Steps (patient side payment page)
1. Open the public payment page URL:
   - `http://localhost:3000/pay/<invoiceId>`
2. Expected result:
   - `Secure Payment` card with invoice details appears
   - `Payment summary` card shows totals
3. If no pay link exists yet, click `Generate Secure Checkout Link`.
4. Expected result:
   - A secure checkout URL is generated and the button changes to `Continue to Secure Checkout`
5. Click `Continue to Secure Checkout`.
6. Expected result:
   - Browser opens secure checkout in a new tab/window (Stripe or local fallback link depending on setup).

## Story 10: Daily Operations Loop (Owner + Front Desk)

### Goal
Simulate a typical clinic day using Healio’s main modules.

### Sequence
1. `Owner` signs in at `/login`.
2. Goes to `/settings` and checks `Clinic Profile`, `Operating Hours`, and `Notification Preferences` via drawers.
3. `Front desk` opens `/appointments` and clicks `Load Demo Day` to prepare timeline data.
4. `Patient` (or front desk on behalf of patient) books via `/book/northview-clinic`.
5. `Front desk` refreshes `/appointments`, opens the appointment drawer, updates status, and adds notes.
6. `Front desk` opens `/patients`, searches patient, opens chart, reviews `Visits/Documents/Billing` tabs.
7. `Front desk` goes to `/billing`, creates invoice, and sends a payment link.
8. `Patient` opens `/pay/<invoiceId>` and proceeds to secure checkout.
9. `Owner` checks `/analytics` and `/billing` for operational and revenue visibility.

## Known Current Build Notes (Useful During Testing)

- Some UI flows are intentionally shell-first (drawer UX exists before full persistence logic in some areas).
- Supabase auth email actions can hit provider rate limits during repeated testing (`over_email_send_rate_limit`).
- Local demo/fallback data is available for several flows (notably public booking with `northview-clinic`).
- Protected dashboard routes may rely on local dev auth helpers when running on localhost.

## Suggested Test Order (Fastest End-to-End Validation)

1. `/signup` → create login + provision clinic
2. `/login` → test password and Google CTA visibility
3. `/settings` → open all 3 edit drawers
4. `/book/northview-clinic` → complete a booking + download `.ics`
5. `/appointments` → load demo day + open appointment drawer
6. `/patients` → search and open chart (or route manually)
7. `/billing` → create/edit invoice
8. `/pay/<invoiceId>` → generate secure checkout link
