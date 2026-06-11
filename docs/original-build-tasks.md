# TASKS.md

Complete these tasks in order. Do not skip ahead. After completing each task, verify against the "Done when" checklist before committing. Then move to the next task.

Full technical spec is in `docs/spec.md`. Reference it for schema details, allocation rules, cron logic, and UI specifications.

---

## Task 0: Environment Setup

Set up all external accounts and credentials needed for the project.

**Do this:**
- Create a Supabase project (free tier)
- Enable Google OAuth provider in Supabase (Authentication → Providers → Google)
- Disable public sign-ups in Supabase (Authentication → Settings)
- Create the admin user account in Supabase manually
- Create a Resend account, verify a domain, grab the API key
- Generate a CRON_SECRET (`openssl rand -hex 32`)
- Create `.env.local` in the repo root with all env vars listed in docs/spec.md

**Done when:**
- [ ] `.env.local` exists with all 7 env vars populated
- [ ] Supabase project is live and accessible
- [ ] Google OAuth is enabled in Supabase
- [ ] Sign-ups are disabled in Supabase
- [ ] Resend domain is verified

---

## Task 1: Project Scaffold + Prisma Schema

Set up the Next.js project and database schema.

**Do this:**
- Initialize Next.js 15 with TypeScript strict, pnpm, App Router
- Install and configure: Prisma, shadcn/ui, Tailwind CSS, @supabase/ssr
- Create the Prisma schema exactly as defined in docs/spec.md (7 models, 2 enums)
- Run `npx prisma migrate dev` against the Supabase database
- Set up the project structure as defined in docs/spec.md

**Done when:**
- [ ] `pnpm build` succeeds
- [ ] `npx prisma validate` passes
- [ ] `npx prisma studio` shows all 7 models (Property, Tenant, Lease, PaymentPeriod, Payment, EmailLog, AppSettings) and 2 enums (PeriodStatus, TriggerType)
- [ ] Project structure matches docs/spec.md
- [ ] Commit pushed to main: `chore: scaffold project and prisma schema`

---

## Task 2: Authentication

Set up Supabase Auth with login page.

**Do this:**
- Create `lib/supabase.ts` with server and browser Supabase clients using `@supabase/ssr`
- Create middleware that protects all `(dashboard)` routes — redirects unauthenticated users to `/login`
- Build `/login` page with email/password form and Google OAuth button
- Verify both login methods work in the browser

**Done when:**
- [ ] Visiting `/` while logged out redirects to `/login`
- [ ] Can log in with email/password
- [ ] Can log in with Google OAuth
- [ ] After login, redirects to dashboard
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: auth setup with supabase`

---

## Task 3: Dashboard Layout + Home Page

Build the top bar navigation and dashboard home page.

**Do this:**
- Create `(dashboard)/layout.tsx` with top bar: App name | Dashboard | Email | [+ Add Property] | [Log Payment]
- Build dashboard home page per Section 2 of docs/spec.md:
  - Summary stat cards (total properties, payments this month, needing attention count)
  - Property list split into "Needs Attention" and "All Good" sections
  - Status chips (green Paid, amber Due, red Late, gray No Lease)
  - Row click navigates to property detail
- Implement lazy period creation on dashboard load (see docs/spec.md)
- Handle empty state: "Add Your First Property" CTA when no properties exist
- Mobile responsive: table → card list under 768px, top bar → hamburger

**Done when:**
- [ ] Dashboard loads with empty state message
- [ ] Top bar shows all 4 items (Dashboard, Email, + Add Property, Log Payment)
- [ ] Mobile view (375px) renders card list and hamburger menu
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: dashboard layout and home page`

---

## Task 4: Property Detail + Add Property

Build the property detail page and add property form.

**Do this:**
- Build `/properties/new` form: Name field (required), Notes field (optional)
- After creation, redirect to the new property's detail page
- Build `/properties/[id]` detail page per Section 3 of docs/spec.md:
  - Property header (name, notes)
  - Active lease card (tenant info, rent, dates, next due, credit balance, Log Payment button, Edit Lease button)
  - Recent payments list (last 5, "View All" expands inline)
  - "No Active Lease" state with "Add Lease" CTA
- Wire up the [+ Add Property] button in the top bar to navigate to `/properties/new`

**Done when:**
- [ ] Can create a property via the form
- [ ] After creation, lands on property detail page showing "No Active Lease"
- [ ] [+ Add Property] button in top bar works
- [ ] Property appears on dashboard with "No Lease" gray chip
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: property detail and add property`

---

## Task 5: Lease Management

Build lease creation and editing forms.

**Do this:**
- Build `/properties/[id]/leases/new` per Section 4 of docs/spec.md:
  - Tenant section: Name, Email (inline)
  - Lease section: First Rent Due (month/year picker), Lease Ends (month/year picker), Monthly Rent (dollar input), Notes
  - Tenant deduplication: if email matches existing tenant, prompt to reuse
  - On create: validate no active lease exists, create Lease + all PaymentPeriods
- Build `/properties/[id]/leases/[leaseId]/edit` per docs/spec.md:
  - Extend-only: reject if new lastPeriodMonth <= existing
  - On extend: create new PaymentPeriods for added months
  - On rent change: only update future periods
- Tenant info editable inline on property detail page

**Done when:**
- [ ] Can create a lease with a new tenant (month/year pickers work)
- [ ] PaymentPeriod rows created for every month of the lease term (verify in Prisma Studio)
- [ ] Property detail shows lease info, tenant info, next due date
- [ ] Dashboard status chip updates to reflect the lease
- [ ] Can extend a lease — new periods created
- [ ] Cannot shorten a lease — error message shown
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: lease management`

---

## Task 6: Payment Tracking

Build the Log Payment modal and allocation logic. This is the most critical task — read Section 5 of docs/spec.md carefully.

**Do this:**
- Build the Log Payment modal:
  - Property dropdown (pre-selected when opened from a specific property)
  - Amount, Date Received, Payment Method (dropdown), Reference #, Notes
  - Wire up: dashboard row action, property detail button, top bar [Log Payment] button
- Implement allocation logic (server-side, inside a Prisma $transaction):
  - All 8 steps from docs/spec.md Section 5
  - Set paymentId on each RECEIVED period
  - Idempotency via clientRequestId
- Build Edit Payment (reverse allocation via paymentId, re-run with new amount)
- Build Delete Payment (reverse allocation, hard-delete payment)

**Done when:**
- [ ] Can log a payment from dashboard row action, property detail, and top bar button
- [ ] Payment of exactly 1 month's rent → 1 period flips to RECEIVED with paymentId set
- [ ] Payment of 3x rent → 3 periods flip to RECEIVED
- [ ] Non-multiple payment (e.g. $10,500 on $4,000 rent) → 2 months covered, $2,500 credit
- [ ] Credit balance shows on property detail when > 0
- [ ] Edit payment → old periods revert to PENDING, new allocation applied
- [ ] Delete payment → periods revert to PENDING, payment row deleted
- [ ] Double-submit (same clientRequestId) → no duplicate payment
- [ ] Dashboard status chips update correctly after payment
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: payment tracking and allocation`

---

## Task 7: Email Page + Cron Jobs

Build the email configuration page and all three cron jobs.

**Do this:**
- Build `/email` page per Section 6 of docs/spec.md:
  - Email timing section (toggles + number inputs)
  - Email copy section (subject + body text areas with placeholder docs)
  - Recent emails section (last 20 EmailLog entries)
- Implement AppSettings singleton pattern with `getSettings()` fallback defaults
- Build all 3 cron routes per docs/spec.md:
  - `/api/cron/send-reminders` — daily email processor
  - `/api/cron/ensure-periods` — monthly period creation
  - `/api/cron/flag-late` — daily late payment flag
- All crons: validate CRON_SECRET + x-vercel-cron header, idempotent
- Create `vercel.json` with cron schedules
- Set up Resend client in `lib/resend.ts`, use EMAIL_FROM env var

**Done when:**
- [ ] Email page loads with default settings (even with no AppSettings row in DB)
- [ ] Can edit email timing and copy, save persists
- [ ] Manually hitting `/api/cron/flag-late` flips overdue PENDING periods to LATE
- [ ] Manually hitting `/api/cron/ensure-periods` creates next month's periods (idempotent)
- [ ] Manually hitting `/api/cron/send-reminders` sends emails on correct trigger dates (verify in EmailLog)
- [ ] Re-running any cron produces no duplicates
- [ ] Dashboard status chips reflect LATE status after flag-late runs
- [ ] `pnpm build` succeeds
- [ ] Commit pushed to main: `feat: email settings and cron jobs`

---

## Task 8: Final Verification

Run through the full verification checklist in docs/spec.md (Section: Verification Checklist, items 1–23).

**Do this:**
- Start the dev server
- Test every item on the checklist in the browser
- Fix any failures
- Run `pnpm build` one final time

**Done when:**
- [ ] All 23 verification checklist items pass
- [ ] `pnpm build` succeeds
- [ ] All fixes committed and pushed to main: `fix: verification checklist fixes`

---

## Task 9: Deploy to Vercel

Connect the repo to Vercel and deploy.

**Do this:**
- Connect the GitHub repo to Vercel (via browser)
- Set all environment variables in Vercel dashboard:
  - DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  - RESEND_API_KEY, EMAIL_FROM, CRON_SECRET
- Deploy to production
- Verify the live URL works: login, create property, log payment
- Verify cron jobs are registered in Vercel dashboard

**Done when:**
- [ ] App is live on a Vercel URL
- [ ] Can log in on the live URL
- [ ] Can create a property, add a lease, log a payment on the live URL
- [ ] Cron jobs visible in Vercel dashboard
- [ ] Commit pushed to main: `chore: vercel deployment config`
