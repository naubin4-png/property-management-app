# Property Management Platform — Engineering Spec (V2)

## Overview

A simple web app for one owner to track rent across a portfolio of ~40–60 commercial leases. The owner cares about three things:

1. Seeing his properties and whether rent has been paid
2. Logging payments as checks/wires come in
3. Reminder emails to tenants going out automatically

Everything in this spec exists in service of those three things. Single admin user. Mobile-friendly responsive web (no native app).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript (strict mode) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| ORM | Prisma |
| Database | PostgreSQL via Supabase |
| UI | shadcn/ui + Tailwind CSS |
| Email | Resend + React Email |
| Cron Jobs | Vercel Cron Jobs |
| Deployment | Vercel |

---

## Environment Variables

```
DATABASE_URL=          # Supabase pooled connection (PgBouncer, port 6543). Must append ?pgbouncer=true&connection_limit=1
DIRECT_URL=            # Supabase direct connection (port 5432, for prisma migrate AND interactive transactions)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

RESEND_API_KEY=
EMAIL_FROM=              # e.g. reminders@yourdomain.com — must match a verified Resend domain
CRON_SECRET=
```

---

## Project Structure

```
/
├── app/
│   ├── login/page.tsx                         # Supabase Auth login (email/password + Google OAuth)
│   ├── (dashboard)/
│   │   ├── layout.tsx                       # Protected shell with top bar nav
│   │   ├── page.tsx                         # Dashboard home — portfolio overview
│   │   ├── properties/
│   │   │   ├── new/page.tsx                 # Add property form
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 # Property detail (lease, payments, tenant)
│   │   │       └── leases/
│   │   │           ├── new/page.tsx         # Add lease form (tenant entered inline)
│   │   │           └── [leaseId]/edit/page.tsx  # Edit lease (extend-only)
│   │   └── email/page.tsx                   # Email copy + timing settings
│   └── api/
│       └── cron/
│           ├── send-reminders/route.ts      # Daily: send reminder + late notice emails
│           ├── ensure-periods/route.ts      # Monthly: create next month's PaymentPeriods
│           └── flag-late/route.ts           # Daily: mark overdue periods as LATE
├── components/
├── lib/
│   ├── prisma.ts
│   ├── supabase.ts                          # Supabase client (server + browser)
│   ├── resend.ts
│   ├── lease-math.ts                        # Credit balance, next due date computation
│   ├── settings.ts                          # AppSettings loader with fallback defaults
│   └── cron-auth.ts                         # CRON_SECRET + x-vercel-cron validation
├── prisma/
│   └── schema.prisma
├── emails/                                  # React Email templates
│   ├── RentReminder.tsx                     # Renders DB-stored copy with variable substitution
│   └── LateNotice.tsx                       # Renders DB-stored copy with variable substitution
└── vercel.json                              # Cron schedule definitions
```

---

## Data Model

### Core Concept

```
Property (the asset — a physical unit or suite)
  └── Lease (one Property + one Tenant for a defined term)
        ├── PaymentPeriod (one row per month owed — tracks obligation + status)
        └── Payment (one row per actual payment received)

Tenant (the paying entity — created inline when adding a lease)

EmailLog (record of every sent email — for dedup)
AppSettings (single-row global config: email copy + timing)
```

### Key Concepts

**Next Payment Due** is computed, never stored. It is the `periodMonth` of the earliest `PaymentPeriod` for a lease where `status IN ('PENDING', 'LATE')`.

**Credit Balance** is computed, never stored. It is the running difference between total paid on a lease and total allocated to periods. Overpayments increase it; future payments draw it down before requiring new cash.

**The owner never picks months.** When logging a payment, he enters one dollar amount. The system applies it forward starting from the oldest unpaid period, marking periods RECEIVED as it goes, and parks any leftover as credit. The UI never shows a month-by-month checkbox.

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum PeriodStatus {
  PENDING
  RECEIVED
  LATE
}

enum TriggerType {
  RENT_REMINDER
  LATE_NOTICE
}

// The physical asset — a rentable unit or suite.
model Property {
  id        String   @id @default(uuid())
  name      String   // whatever the owner calls it — "Harbor Office Suite 4", "123 Main St", etc.
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  leases Lease[]
}

// The paying entity. Created inline from the lease creation form.
// One tenant can hold multiple leases (one row, multiple FKs), but the UI
// does not surface this — tenants are always viewed in the context of a property.
model Tenant {
  id        String   @id @default(uuid())
  name      String   // company name or individual name — whatever the owner uses
  email     String   // where reminders and late notices are sent
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  leases    Lease[]
  emailLogs EmailLog[]
}

// A lease agreement linking one Property to one Tenant for a defined term.
// Lease status is NOT stored — computed from lastPeriodMonth at query time.
model Lease {
  id         String   @id @default(uuid())
  propertyId String
  property   Property @relation(fields: [propertyId], references: [id])
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  firstPeriodMonth DateTime @db.Date  // always the 1st of a month; UI is a month/year picker
  lastPeriodMonth  DateTime @db.Date  // always the 1st of a month; UI is a month/year picker
  rentCents        Int                // monthly rent in cents
  notes            String?            // free text — move-in date, physical items, keys, etc.

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  paymentPeriods PaymentPeriod[]
  payments       Payment[]
}

// One row per month of rent owed on a lease. Created by:
//   1. Lease creation (creates ALL periods for the full lease term at once)
//   2. Monthly cron (ensures next month's period exists — belt-and-suspenders for #1)
//   3. Lease extension (creates periods for the newly added months immediately)
//   4. Lazy-create on dashboard load (catch-up if cron missed)
// Due date is ALWAYS the 1st of the month — no exceptions.
model PaymentPeriod {
  id      String @id @default(uuid())
  leaseId String
  lease   Lease  @relation(fields: [leaseId], references: [id])

  periodMonth    DateTime     @db.Date  // always the 1st of the month; @db.Date eliminates time-zone bugs
  amountDueCents Int                     // snapshot of lease.rentCents at time of creation
  status         PeriodStatus @default(PENDING)

  // Set when allocation marks this period RECEIVED; null when PENDING/LATE.
  // Used to reverse allocation on payment edit/delete: query WHERE paymentId = X → flip back to PENDING.
  paymentId String?
  payment   Payment? @relation(fields: [paymentId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([leaseId, periodMonth])
}

// A single logged payment. Amount entered by owner; system applies it forward
// from the oldest unpaid period, marking periods RECEIVED and tracking leftover as credit.
model Payment {
  id      String @id @default(uuid())
  leaseId String
  lease   Lease  @relation(fields: [leaseId], references: [id])

  receivedAt       DateTime @db.Date          // defaults to today; owner can override
  amountCents      Int                         // total paid in this transaction
  paymentMethod    String?                     // CHECK | WIRE | ACH | OTHER — optional
  paymentReference String?                     // check number, wire ref, etc.
  notes            String?
  clientRequestId  String  @unique             // UUID generated when modal opens; dedupes double-submits

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  coveredPeriods PaymentPeriod[]               // periods marked RECEIVED by this payment
}

// Immutable log of every email sent. Used for dedup so the same reminder
// can't fire twice for the same (tenant, trigger, period).
model EmailLog {
  id              String       @id @default(uuid())
  tenantId        String?
  tenant          Tenant?      @relation(fields: [tenantId], references: [id])
  leaseId         String?
  periodMonth     DateTime?    @db.Date
  toAddress       String
  subject         String
  triggerType     TriggerType
  resendMessageId String?
  sentAt          DateTime     @default(now())
  error           String?

  // Prevents duplicate emails if the cron is retried. Upsert with ON CONFLICT DO NOTHING.
  @@unique([tenantId, triggerType, periodMonth])
}

// Single-row table for global app settings. Singleton pattern: id = "singleton".
// getSettings() must gracefully handle a missing row by upserting defaults.
model AppSettings {
  id                  String  @id @default("singleton")

  // Email automation toggles
  reminderEnabled     Boolean @default(true)   // master on/off
  sendBeforeDue       Boolean @default(true)   // send reminder before due date
  sendAfterDue        Boolean @default(true)   // send late notice after due date
  daysBeforeReminder  Int     @default(3)      // X days before the 1st
  daysAfterLateNotice Int     @default(5)      // X days after the 1st
  gracePeriodDays     Int     @default(5)      // PENDING → LATE threshold

  // Email body copy — owner-editable. Supports placeholders documented in UI.
  reminderEmailSubject String  @default("Rent reminder for {property_name}")
  reminderEmailBody    String  @default("Hi {tenant_name},\n\nThis is a friendly reminder that rent of {amount_due} for {property_name} is due on {due_date}.\n\nThanks!")
  lateNoticeSubject    String  @default("Rent past due for {property_name}")
  lateNoticeBody       String  @default("Hi {tenant_name},\n\nOur records show that rent of {amount_due} for {property_name} was due on {due_date} and has not yet been received. Please let me know the status.\n\nThanks!")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Computed Values (No DB Fields)

### Lease Status

```ts
type LeaseStatus = 'ACTIVE' | 'EXPIRED'

// Lease is active if we're in or before the last rent month. Expired once we're past it.
function getLeaseStatus(lease: { lastPeriodMonth: Date }): LeaseStatus {
  return lease.lastPeriodMonth >= firstDayOfCurrentMonth() ? 'ACTIVE' : 'EXPIRED'
}
```

### Next Payment Due

```ts
function getNextDuePeriod(periods: PaymentPeriod[]): PaymentPeriod | null {
  return periods
    .filter(p => p.status === 'PENDING' || p.status === 'LATE')
    .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime())[0] ?? null
}
```

### Credit Balance

```ts
// Sum of all payments on a lease, minus sum of amounts allocated to RECEIVED periods.
// What's left is sitting as credit and will be drawn down by future payments.
function getCreditBalance(lease: Lease): number {
  const totalPaidCents = sum(lease.payments.map(p => p.amountCents))
  const totalAllocatedCents = sum(
    lease.paymentPeriods
      .filter(p => p.status === 'RECEIVED')
      .map(p => p.amountDueCents)
  )
  return totalPaidCents - totalAllocatedCents
}
```

---

## Feature Specifications

### 1. Authentication

- Supabase Auth handles all auth. Supports email/password and Google OAuth (Gmail login).
- Use `@supabase/ssr` for Next.js server-side auth. Middleware checks session on all `(dashboard)` routes.
- Unauthenticated requests redirect to `/login`.
- Sign-ups disabled in Supabase dashboard (Authentication → Settings → disable "Allow new users to sign up"). Admin user created manually.
- No multi-user, no roles.

---

### 2. Dashboard Home (`/`)

The dashboard answers "what do I need to do today?" first, then "everything else" second.

**Top bar navigation:**
- Left: App name (links to dashboard)
- Right: **Dashboard** | **Email** | **[+ Add Property]** button | **[Log Payment]** button

**[+ Add Property]** navigates to `/properties/new`.

**[Log Payment]** opens a modal with:
- Property dropdown (select from all properties with active leases)
- Standard payment fields (amount, date, method, reference, notes)
- On submit, runs allocation and returns to dashboard.

**Summary stat cards (top row, informational — not clickable):**
- Total active properties
- Payments received this month
- Properties needing attention (LATE + DUE count)

**Property list, split into two sections:**

**Needs Attention** (top, only shown if any rows exist):
- Properties with status LATE or DUE
- Columns: Property Name, Tenant, Monthly Rent, Next Due Date, Status, Actions

**All Good** (bottom):
- All other properties (PAID, NO LEASE)
- Same columns

**Status chip:**
- Green "Paid" — next due date is in the future
- Amber "Due" — next due date has passed but grace period hasn't expired
- Red "Late" — at least one period exists with status LATE
- Gray "No Lease" — property has no active lease

**Actions column:** "Log Payment" icon-button on any row with an active lease (opens Log Payment modal pre-populated with that property). Clicking a row elsewhere navigates to `/properties/[id]`.

---

### 3. Property Detail (`/properties/[id]`)

Accessed by clicking a property row on the dashboard.

- Property info header: name, notes
- Active lease card (if one exists):
  - Tenant: name, email
  - Monthly rent, first rent due, lease ends
  - **Next Payment Due: [date] — [amount]** (prominent)
  - **Credit Balance: [amount]** (shown only if > 0)
  - Quick action: "Log Payment"
  - "Edit Lease" button (extend end date or change rent only)
- Recent payments: last 5 payments inline (Date, Amount, Method, Reference). "View All" expands to full list inline (no separate page).
- If no active lease: "No Active Lease" callout with "Add Lease" button

**Add Property form** (`/properties/new`):
- Fields: Name, Notes (optional)
- Validation: name required
- After creation, redirects to the new property's detail page (which shows "No Active Lease" + "Add Lease" CTA)

---

### 4. Lease Management

Leases are created from the property detail page. Tenant info is entered inline on the lease creation form — there is no separate tenant directory or tenant creation flow.

**Add Lease form** (`/properties/[id]/leases/new`):
- **Tenant section** (inline):
  - Tenant Name, Email
  - On submit, a new `Tenant` row is created (or, if the email matches an existing tenant, the existing row is reused — see note below)
- **Lease section**:
  - First Rent Due (month/year picker — stores as the 1st of the selected month)
  - Lease Ends (month/year picker — stores as the 1st of the selected month; must be after First Rent Due)
  - Monthly Rent (dollar input, stored as cents)
  - Notes (free text — can include actual move-in date, physical items, keys, etc.)
- On create:
  - Server validates: property has no active (non-EXPIRED) lease
  - Server validates: lastPeriodMonth >= firstPeriodMonth
  - Creates the Lease row
  - Creates `PaymentPeriod` rows for every month from `firstPeriodMonth` through `lastPeriodMonth` (inclusive)

**Tenant deduplication on create:** if the entered email matches an existing tenant's email, the form prompts: "A tenant with this email already exists — link this lease to that tenant?" with Yes / No. Yes reuses the existing row; No creates a new tenant. This handles the rare multi-property case without a separate UI.

**Edit Lease form** (`/properties/[id]/leases/[leaseId]/edit`):
- Editable: Lease Ends month (extend-only — see rule below), monthly rent (future periods only), notes
- Read-only: tenant info, first rent due month, property
- **Extend-only rule:** server rejects any edit where new `lastPeriodMonth` <= existing `lastPeriodMonth`. Error message: "Leases can only be extended, not shortened. To change tenants, let the lease expire and create a new one."
- **On extend:** server immediately creates `PaymentPeriod` rows for the newly added months (from old lastPeriodMonth + 1 month through new lastPeriodMonth, idempotent via the unique constraint).
- **On rent change:** only `PaymentPeriod` rows for future months (where `periodMonth > today`) get their `amountDueCents` updated. Existing PENDING/LATE/RECEIVED periods are untouched.

**Tenant info edits:** editable inline on the property detail page. Edits update the underlying `Tenant` row, which affects every lease using that tenant.

**No void / no waive / no terminate.** If a lease ends early (rare), let it expire naturally or just leave it; create a new lease when the next tenant moves in.

---

### 5. Payment Tracking — Core Workflow

This is the heart of the app. **The owner never picks months.** He enters one dollar amount. The system does all the math.

**Log Payment modal:**
- Opens from: dashboard row action (pre-selects property), property detail page, or top bar [Log Payment] button (property dropdown)
- Fields:
  - **Property** (dropdown — pre-selected if opened from a specific property, otherwise owner picks)
  - **Amount** (dollar input, required) — the total amount being logged
  - **Date Received** (date picker, defaults to today)
  - **Payment Method** (dropdown: CHECK / WIRE / ACH / OTHER, optional)
  - **Reference #** (optional)
  - **Notes** (optional)
- On submit, server runs allocation (see below) and returns to dashboard.

**Allocation rules (server-side, on submit, inside a single transaction):**

1. Reject if `amountCents <= 0`.
2. Compute `effectiveAmountCents = getCreditBalance(lease) + payment.amountCents`.
3. Fetch all PENDING and LATE periods for the lease, ordered by `periodMonth` ascending.
4. Compute `monthsToCover = floor(effectiveAmountCents / lease.rentCents)`.
5. If `monthsToCover` exceeds existing PENDING/LATE periods, upsert additional future periods (each with `amountDueCents = lease.rentCents`) to fill the gap, up to the lease's `lastPeriodMonth`.
   - If the lease would end before `monthsToCover` is satisfied, reject with: "Payment exceeds remaining rent on this lease."
6. Mark the first `monthsToCover` periods (oldest first) as `RECEIVED` **and set `paymentId` to this Payment's id** on each.
7. Create the `Payment` row with the full `amountCents`.
8. Any leftover (`effectiveAmountCents % lease.rentCents`) sits as credit balance — computed on next read, never stored.

**Idempotency:** Payment uses `clientRequestId` (UUID generated when the modal opens). Server upserts on this key — double-submit returns the same Payment row, no duplicates.

**Edit Payment:**
- Opens the same modal pre-filled with the existing payment's values
- On save, the server:
  1. Reverses the original allocation: `UPDATE PaymentPeriod SET status = 'PENDING', paymentId = NULL WHERE paymentId = [this payment's id]` (the `flag-late` cron will catch up overdue ones on its next run)
  2. Re-runs the allocation logic with the new amount
- All inside a transaction. If the new allocation fails validation, nothing changes.

**Delete Payment:** Same reversal (`WHERE paymentId = X` → flip to PENDING, null out paymentId), then hard-delete the Payment row. No re-allocation.

---

### 6. Email Reminders

Two email triggers: a reminder before rent is due, and a late notice after if unpaid. Both are owner-configurable: timing and copy.

**Email page** (`/email`):

**Email Timing section:**
- **Reminders Enabled** — master toggle
- **Send reminder before due date** — toggle + "X days before" number input (default: 3)
- **Send late notice after due date** — toggle + "X days after" number input (default: 5)
- **Grace period (days)** — number input (default: 5). Used for both:
  - Flipping PENDING → LATE in the cron
  - Dashboard status chip Amber → Red transition

**Email Copy section:**
- **Rent reminder subject** — text input
- **Rent reminder body** — multi-line text area
- **Late notice subject** — text input
- **Late notice body** — multi-line text area
- **Supported placeholders** (documented next to the inputs):
  - `{tenant_name}` — tenant name
  - `{property_name}` — property name
  - `{amount_due}` — formatted dollar amount
  - `{due_date}` — formatted date
- Substitution happens server-side at send time; no escaping issues since the body becomes plain-text email content.

**Recent Emails section:**
- Last 20 `EmailLog` entries: Date Sent, Recipient, Subject, Status (Sent / Failed)
- Gives the owner confidence the automation is working

**Sending behavior:**
- All emails sent via Resend using `EMAIL_FROM` env var as the sender address.
- Reminder fires once per (tenant, period) when `today == periodMonth - daysBeforeReminder` AND status is PENDING.
- Late notice fires once per (tenant, period) when `today == periodMonth + daysAfterLateNotice` AND status is PENDING or LATE.
- Both deduped via `EmailLog` (matching tenantId + triggerType + periodMonth).
- Skipped entirely if `reminderEnabled = false` or the respective `sendBeforeDue`/`sendAfterDue` toggle is off.

---

### 7. UX Patterns (Global)

**Mobile responsiveness:**
- Dashboard table renders as a card list under 768px
- Top bar collapses to a hamburger menu
- Log Payment modal becomes a full-screen sheet
- Forms stack to single column

**Empty states:**
- Dashboard with no properties: welcome message + "Add Your First Property" CTA
- Property detail with no lease: "No Active Lease" + "Add Lease" CTA

**Confirmation:** Destructive actions (delete payment) require a confirmation modal. Edits don't.

**Feedback:** All mutations show a toast on success. Errors show inline form messages plus a toast for server errors.

---

## Cron Jobs

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/send-reminders", "schedule": "0 7 * * *"  },
    { "path": "/api/cron/ensure-periods", "schedule": "0 6 28 * *" },
    { "path": "/api/cron/flag-late",      "schedule": "0 9 * * *"  }
  ]
}
```

All routes validate **both** `Authorization: Bearer ${CRON_SECRET}` **and** `x-vercel-cron: 1`. All must be idempotent. All call `getSettings()` (which gracefully handles a missing row).

---

### Job 1: Daily Email Processor (`/api/cron/send-reminders`)

**Schedule:** Daily at 07:00 UTC

```
1. Load settings. If reminderEnabled = false → exit.

2. BEFORE-DUE REMINDER (only if sendBeforeDue = true):
   targetDueDate = today + daysBeforeReminder days
   IF targetDueDate is the 1st of a month:
     Query PaymentPeriod WHERE:
       periodMonth = targetDueDate
       AND status = 'PENDING'
       AND lease is active (lastPeriodMonth >= current month)
     For each matched period:
       a. Skip if EmailLog row exists for (tenantId, 'RENT_REMINDER', periodMonth)
       b. Render reminder email with current copy + placeholder substitution
       c. Send via Resend
       d. Log to EmailLog

3. LATE NOTICE (only if sendAfterDue = true):
   targetDueDate = today - daysAfterLateNotice days
   IF targetDueDate is the 1st of a month:
     Query PaymentPeriod WHERE:
       periodMonth = targetDueDate
       AND status IN ('PENDING', 'LATE')
       AND lease is active
     For each matched period:
       a. Skip if EmailLog row exists for (tenantId, 'LATE_NOTICE', periodMonth)
       b. Render late notice email
       c. Send via Resend
       d. Log to EmailLog
```

---

### Job 2: Monthly Period Creation (`/api/cron/ensure-periods`)

**Schedule:** 28th of each month at 06:00 UTC

```
1. Compute targetMonth = first day of next calendar month (UTC)

2. For each Lease where lastPeriodMonth >= targetMonth:
   INSERT INTO PaymentPeriod (leaseId, periodMonth = targetMonth, amountDueCents = lease.rentCents)
   ON CONFLICT (leaseId, periodMonth) DO NOTHING
```

Backed up by lazy creation on dashboard load (see below) — if the cron misses a run, the dashboard catches up.

---

### Job 3: Late Payment Flag (`/api/cron/flag-late`)

**Schedule:** Daily at 09:00 UTC

```
1. Load settings → gracePeriodDays

2. UPDATE PaymentPeriod
   SET status = 'LATE', updatedAt = now()
   WHERE status = 'PENDING'
     AND periodMonth + gracePeriodDays days <= today (UTC)
```

Idempotent — only flips PENDING → LATE.

---

### Lazy Period Creation (Dashboard Load)

Belt-and-suspenders for Job 2. On every dashboard load, before rendering:

```
For each active lease:
  IF no PaymentPeriod exists for current month → upsert one
  IF no PaymentPeriod exists for next month → upsert one
```

Cheap query, idempotent, eliminates the "cron silently failed" failure mode.

---

## Key Implementation Rules

| Rule | Detail |
|---|---|
| **Money** | Always store as integer cents. Display: `(cents / 100).toFixed(2)`. Never use FLOAT. |
| **Dates** | `firstPeriodMonth`, `lastPeriodMonth`, `periodMonth`, `receivedAt` are `@db.Date` (no time component). All month fields are always the 1st. This makes timezone bugs structurally impossible. |
| **Lease end** | Stored as `lastPeriodMonth`. No computation needed. |
| **Lease status** | Never stored. Active if `lastPeriodMonth >= firstDayOfCurrentMonth()`, otherwise Expired. |
| **Next due date** | Never stored. Computed as earliest PENDING/LATE PaymentPeriod. |
| **Credit balance** | Never stored. Computed as `sum(payments) − sum(RECEIVED periods)`. |
| **Due date is always the 1st** | Universal. No per-tenant or per-lease variation. |
| **Owner never picks months** | The Log Payment modal takes a dollar amount. The system applies it to oldest unpaid periods, marks them RECEIVED, parks leftover as credit. |
| **Server recomputes on every payment** | Client-supplied amounts are never trusted as-is — the server fetches the current lease state, applies the allocation logic, and writes the result inside a transaction. |
| **Allocation is transactional** | Fetch periods, validate, mark RECEIVED (setting `paymentId` on each), create Payment — all in one Prisma `$transaction`. Period-status check inside the transaction catches stale-tab races. |
| **Payment reversal uses paymentId** | On edit/delete payment, query `WHERE paymentId = X` to find exactly which periods to flip back to PENDING and null out `paymentId`. |
| **Idempotency on Log Payment** | Client generates a UUID when the modal opens; server upserts Payment on `clientRequestId` to dedupe double-submits. |
| **Leases are extend-only** | Server rejects edits where new `lastPeriodMonth` <= existing. |
| **On lease extend** | Immediately create PaymentPeriods for added months (upsert, idempotent). |
| **On rent change** | Only future-month periods (`periodMonth > today`) get the new `amountDueCents`. Historical periods are immutable. |
| **No void / no waive / no terminate** | Mis-logs are corrected via Edit Payment or Delete Payment. No status transitions beyond PENDING ↔ RECEIVED ↔ LATE. |
| **No property deletion** | Properties cannot be deleted via the UI. No delete endpoint needed. |
| **Idempotent crons** | `ON CONFLICT DO NOTHING` for periods. EmailLog unique constraint `(tenantId, triggerType, periodMonth)` dedupes emails even under cron retries. |
| **Cron auth** | Verify `Authorization: Bearer ${CRON_SECRET}` AND `x-vercel-cron: 1` header. |
| **Lazy period creation** | Dashboard load upserts current + next month's periods for every active lease. |
| **AppSettings resilience** | `getSettings()` gracefully upserts defaults on a missing row. |
| **Tenant deduplication** | When creating a lease, if email matches an existing tenant, prompt to reuse that record. |

---

## Verification Checklist

1. `npx prisma migrate dev` runs clean; all 7 models + 2 enums visible (Property, Tenant, Lease, PaymentPeriod, Payment, EmailLog, AppSettings, PeriodStatus, TriggerType)
2. Unauthenticated request to `/` redirects to `/login`; public sign-up is blocked; Google OAuth login works
3. Create property → create lease with new tenant inline (first rent due: Jan 2025, lease ends: June 2027) → verify PaymentPeriod rows created for all 30 months (Jan 2025 through June 2027 inclusive)
4. Dashboard shows property with correct next due date and "Due" status
5. Log a payment of exactly one month's rent → verify Payment created, oldest PENDING period flipped to RECEIVED with `paymentId` set, next due advances one month
6. Log a payment of 3× monthly rent → verify 3 periods flipped to RECEIVED (all with same `paymentId`), next due advances 3 months
7. Log a payment that is NOT a multiple of rent (e.g. rent is $4,000, log $10,500) → payment accepted, 2 months covered ($8,000), $2,500 sits as credit balance
8. Lease has credit balance from prior overpayment, log a new payment → credit is combined with new payment before allocation (e.g. $2,500 credit + $5,500 payment = $8,000 effective → covers 2 months at $4,000/month, credit now $0)
9. Dashboard "Needs Attention" section shows only LATE + DUE properties; "All Good" shows the rest
10. Edit a payment to change its amount → query `PaymentPeriod WHERE paymentId = X`, flip to PENDING, null out paymentId, then re-run allocation with new amount
11. Delete a payment → all periods with matching `paymentId` revert to PENDING (paymentId nulled), payment row hard-deleted
12. Extend a lease by moving Lease Ends from June 2027 to December 2028 → 18 new PaymentPeriod rows created immediately (July 2027 through Dec 2028)
13. Attempt to move Lease Ends to an earlier month → server rejects with extend-only error
14. Create a second lease on a property with an active lease → server rejects
15. Run `ensure-periods` cron → next month's periods created (idempotent — re-run creates no duplicates)
16. Run `flag-late` cron → PENDING periods past grace period flip to LATE → dashboard shows red
17. Run `send-reminders` cron on the correct trigger date → email sent → logged → re-run sends no duplicates (enforced by unique constraint on EmailLog)
18. Edit reminder email body to "Hi {tenant_name}, $X due" → verify next sent reminder substitutes correctly
19. Toggle `sendBeforeDue` off → reminder cron skips before-due sends but still sends late notices
20. Mobile viewport (375px) — dashboard renders as card list, Log Payment opens as full-screen sheet
21. Fresh database with no AppSettings row → email page loads with defaults, crons run without crashing
22. Lazy period creation: delete the next-month PaymentPeriod for an active lease, load dashboard → period gets recreated
23. Concurrent payment submit (double-click) → same Payment row returned both times via `clientRequestId` dedup; no duplicates

---

## V2+ Notes (Not Built — Design Supports)

| Future feature | How current schema supports it |
|---|---|
| Document storage (lease PDFs) | Add `LeaseDocument` model + Cloudflare R2 |
| Rent escalation | Add `escalationRate` to Lease + a per-period rent snapshot logic; `amountDueCents` already snapshots per period |
| Partial payments | Credit balance already handles non-exact amounts. Full partial-period support would add a `PARTIAL` status on PaymentPeriod + `amountPaidCents` tracking per period |
| Bank auto-verify (Plaid) | Webhook creates a Payment row exactly like manual entry |
| Multiple admin users | Add role-based access to Supabase Auth; AuditLog table for accountability |
| Custom email templates per tenant | Add `EmailTemplate` table; current `AppSettings` copy becomes the fallback |
