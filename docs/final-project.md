# 🏆 Final Project Selection — Top 3 SaaS Ideas

> Ranked by **MRR potential**, **stability**, and **profitability** for **US + Philippines** markets.

---

## Evaluation Criteria

| Criteria | What It Measures |
|---|---|
| **MRR Potential** | How much recurring monthly revenue can this realistically generate at scale? |
| **Stability** | How recession-proof, churn-resistant, and structurally sticky is the product? |
| **Profitability** | How lean can you run it? (Low COGS, low support overhead, high margin) |
| **Dual-Market Fit** | Does it work in both the US and PH without heavy localization? |

---

## 🥇 Rank #1 — CareDesk (Idea #2)

### Patient & Clinic Management for Independent Clinics

**Why #1:** Healthcare is non-cyclical (people always get sick), clinics *must* have scheduling and records, and once a clinic adopts your system, switching costs are extremely high. This makes it the most **stable** and **sticky** SaaS on the list. The pricing tiers ($29–$199/mo) and the sheer volume of independent clinics in both the US and PH give it the highest blended MRR ceiling.

| Factor | Rating | Reasoning |
|---|---|---|
| MRR Potential | ⭐⭐⭐⭐⭐ | 500K+ independent clinics in the US alone. PH private clinic boom adds massive TAM. $29–$199/mo tiers compound fast. |
| Stability | ⭐⭐⭐⭐⭐ | Healthcare is recession-proof. Patient data lock-in = extremely low churn. Regulatory requirements force continued usage. |
| Profitability | ⭐⭐⭐⭐ | Low AI costs (rule-based reminders, CRUD). SMS/email costs are the main variable expense. High gross margins (~85%+). |
| Dual-Market | ⭐⭐⭐⭐⭐ | PH post-COVID telemedicine boom + US solo practitioner underserved market = strong fit in both. |

### Description

A lightweight, modern clinic management system purpose-built for **solo practitioners and small clinics** (1–5 doctors) — the segment that can't afford Epic or Athena but desperately needs to move beyond paper and WhatsApp.

### Core MVP Features

1. **Online Appointment Booking** — Patient-facing booking page with real-time availability
2. **Automated Reminders** — SMS + email reminders to reduce no-shows (typically cuts no-shows by 30–50%)
3. **Patient Records (Lite EMR)** — Simple, searchable digital patient charts (not a full EMR — focus on visit notes, prescriptions, allergies)
4. **Billing & Invoicing** — Generate invoices, track payments, and export for tax/accounting
5. **Dashboard & Analytics** — Daily schedule view, revenue trends, patient volume stats

### Pricing Model

| Tier | Price | Target |
|---|---|---|
| Starter | $29/mo | Solo doctor, 1 location |
| Clinic | $89/mo | Multi-doctor clinic (up to 5 providers) |
| Enterprise | $199/mo | Multi-location + API access |

### High-Level Technical Flow

```
┌─────────────────────────────────────────────────┐
│                  PATIENT FLOW                   │
│                                                 │
│  Patient → Booking Page → Select Slot           │
│         → Confirm → Auto-Reminder (SMS/Email)   │
│         → Check-in → Visit Notes Created        │
│         → Invoice Generated → Payment Tracked   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  DOCTOR FLOW                    │
│                                                 │
│  Login → Daily Schedule Dashboard               │
│       → View Patient Chart → Add Visit Notes    │
│       → Prescribe → Generate Invoice            │
│       → Review Analytics / Revenue              │
└─────────────────────────────────────────────────┘
```

### Tech Stack (Suggested)

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Node.js / Express or Django REST
- **Database:** PostgreSQL
- **Auth:** Clerk or NextAuth
- **SMS/Email:** Twilio + SendGrid
- **Hosting:** Vercel (frontend) + Railway or Render (backend)
- **Payments:** Stripe (US) + PayMongo (PH)

### Go-to-Market

- **PH:** Partner with medical associations, target Facebook groups of Filipino doctors, offer BIR-compliant receipt generation
- **US:** SEO targeting "simple clinic software", Reddit r/medicine and r/dentistry, direct outreach to solo practices on Zocdoc/Healthgrades

---

## 🥈 Rank #2 — RentFlow (Idea #4)

### Property Management SaaS for Small Landlords

**Why #2:** Real estate rental income is a **need-based, recurring activity** — tenants always pay rent, landlords always need to track it. The US has 17M+ small landlords, and PH's Metro Manila condo boom is creating a brand-new landlord class with zero tools. Once a landlord loads their tenants and leases, they never leave.

| Factor | Rating | Reasoning |
|---|---|---|
| MRR Potential | ⭐⭐⭐⭐⭐ | 17M+ mom-and-pop landlords in the US. PH condo rental market is exploding. Free-to-paid funnel with clear upgrade triggers (more units = must upgrade). |
| Stability | ⭐⭐⭐⭐⭐ | Rent collection is non-negotiable. Lease data + tenant history = high switching cost. Housing is recession-resilient. |
| Profitability | ⭐⭐⭐⭐⭐ | Minimal AI costs. Pure CRUD + notifications. Can add payment processing fees (2.9% per ACH/card) as a revenue multiplier. |
| Dual-Market | ⭐⭐⭐⭐ | Strong in both. PH needs localization for GCash/Maya payments. US is the bigger revenue driver. |

### Description

A dead-simple property management tool for **landlords with 2–20 units** who currently track everything on notebooks, spreadsheets, or scattered text messages. Think "Mint for landlords" — clean, modern, and opinionated about simplicity.

### Core MVP Features

1. **Rent Collection & Payment Tracking** — Track who paid, who's late, auto-reminders
2. **Lease Management** — Upload and store lease PDFs, track expiration dates, renewal alerts
3. **Tenant Directory & Messaging** — Centralized tenant contact info + in-app messaging
4. **Maintenance Tickets** — Tenants submit requests, landlords track status (open → in progress → done)
5. **Financial Dashboard** — Rent collected, expenses, net income by property

### Pricing Model

| Tier | Price | Target |
|---|---|---|
| Free | $0/mo | 1 unit (lead magnet) |
| Pro | $25/mo | Up to 10 units |
| Business | $79/mo | Unlimited units + payment processing |

### High-Level Technical Flow

```
┌──────────────────────────────────────────────────┐
│               LANDLORD FLOW                      │
│                                                  │
│  Sign Up → Add Properties → Add Tenants/Leases   │
│         → Track Rent Payments (auto-reminders)   │
│         → Manage Maintenance Tickets             │
│         → View Financial Dashboard               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│               TENANT FLOW                        │
│                                                  │
│  Receive Invite → View Lease Details             │
│               → Submit Maintenance Request       │
│               → Receive Payment Reminders        │
│               → (Optional) Pay Rent Online       │
└──────────────────────────────────────────────────┘
```

### Tech Stack (Suggested)

- **Frontend:** Next.js + Tailwind CSS
- **Backend:** Node.js / Express or Django
- **Database:** PostgreSQL
- **Auth:** Clerk or NextAuth
- **Notifications:** Twilio (SMS) + SendGrid (email)
- **Payments:** Stripe (US) + PayMongo/GCash API (PH)
- **Hosting:** Vercel + Railway

### Go-to-Market

- **PH:** Facebook groups for condo investors, DMCI/Ayala Land buyer communities, real estate agent referrals
- **US:** SEO for "landlord rent tracker app", Reddit r/landlord, BiggerPockets forums, TikTok/YouTube content for first-time landlords

---

## 🥉 Rank #3 — Automated Credential Tracker (Idea #13)

### Credential Management for Healthcare Staffing Agencies

**Why #3:** This is a **compliance-driven, must-have tool** — you literally cannot place a travel nurse without valid credentials. Agencies *must* track expirations or they lose revenue. The pricing ($99–$499/mo) is premium and justified by the pain. It's US-focused but extremely high-margin and deeply sticky.

| Factor | Rating | Reasoning |
|---|---|---|
| MRR Potential | ⭐⭐⭐⭐ | ~5,000+ boutique staffing agencies in the US. Premium pricing ($99–$499/mo) means fewer customers needed to hit targets. |
| Stability | ⭐⭐⭐⭐⭐ | Compliance is non-optional. Credential data is deeply embedded in agency ops. Healthcare staffing demand is structurally growing (aging population). |
| Profitability | ⭐⭐⭐⭐⭐ | Minimal infra costs (document storage + OCR + cron jobs for reminders). No AI model costs at MVP. Gross margins ~90%+. |
| Dual-Market | ⭐⭐ | Primarily US (PH has a healthcare staffing industry but the credential complexity that drives value is uniquely American). |

### Description

A focused, fast credential vault for **boutique healthcare staffing agencies** that place travel nurses and locum doctors. Not an HR suite — just the one thing they desperately need: automated tracking of licenses, certifications, and immunization records with expiration alerts and shareable profiles.

### Core MVP Features

1. **Document Upload Portal** — Drag-and-drop upload for licenses, certs, vaccine records
2. **OCR Expiration Detection** — Auto-reads expiration dates from uploaded documents
3. **Automated Alerts** — SMS + email reminders at 60, 30, and 7 days before expiration
4. **Shareable Provider Profiles** — Secure link agencies can send to hospitals during placement
5. **Compliance Dashboard** — At-a-glance view: who's current, who's expiring, who's expired

### Pricing Model

| Tier | Price | Target |
|---|---|---|
| Starter | $99/mo | Up to 50 active providers |
| Growth | $249/mo | Up to 200 providers |
| Enterprise | $499/mo | Unlimited + PSV API integration |

### High-Level Technical Flow

```
┌──────────────────────────────────────────────────┐
│            AGENCY ADMIN FLOW                     │
│                                                  │
│  Create Provider Profile → Upload Docs           │
│      → OCR Extracts Expiration Dates             │
│      → Auto-Schedule Reminder Alerts             │
│      → Generate Shareable Profile Link           │
│      → Send to Hospital for Placement            │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│            PROVIDER (NURSE/DOCTOR) FLOW          │
│                                                  │
│  Receive Invite → Upload Own Documents           │
│               → Get Expiration Reminders         │
│               → Re-upload Renewed Credentials    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│            HOSPITAL FLOW                         │
│                                                  │
│  Receive Shareable Link → View Provider Profile  │
│               → Verify All Credentials Current   │
│               → Approve Placement                │
└──────────────────────────────────────────────────┘
```

### Tech Stack (Suggested)

- **Frontend:** Next.js + Tailwind CSS
- **Backend:** Node.js / Express or Django
- **Database:** PostgreSQL
- **Auth:** Clerk or NextAuth
- **OCR:** Tesseract.js or Google Cloud Vision API
- **File Storage:** AWS S3 or Cloudflare R2
- **Notifications:** Twilio (SMS) + SendGrid (email)
- **Hosting:** Vercel + Railway

### Go-to-Market

- **Primary:** Cold email/call boutique healthcare staffing agency owners via LinkedIn
- **Events:** Attend regional SIA (Staffing Industry Analysts) conferences
- **Content:** SEO for "travel nurse credential tracking software", "JCAHO compliance tracker"
- **Free Trial:** Offer to onboard their first 10 providers for free

---

## 📊 Final Comparison Matrix

| Criteria | 🥇 CareDesk | 🥈 RentFlow | 🥉 Credential Tracker |
|---|---|---|---|
| **MRR Potential** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Stability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Profitability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Dual-Market (US+PH)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Overall** | **🏆 Best All-Around** | **💰 Most Profitable** | **🔒 Most Stable/Sticky** |

---

## 🎯 Recommendation

**Build CareDesk first.** It has the strongest combination of:
- Massive TAM in both US and PH
- Recession-proof demand (healthcare)
- Extremely high switching costs (patient data lock-in)
- Clear, validated pricing ($29–$199/mo)
- Straightforward MVP (no AI needed at launch)

If you want the **leanest path to profit**, go with **RentFlow** — it's pure CRUD with a payment processing revenue multiplier.

If you want the **highest ARPU with fewest customers**, go with **Credential Tracker** — but it's US-only.
