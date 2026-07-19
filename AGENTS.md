# AGENTS.md

## Project

Property Manager is a deployed rent tracker for a single owner with roughly
40-60 commercial leases.

The original build and Phase 2 redesign are complete. This repository is now in
continuous product-development mode: users may describe business or product
problems naturally, and agents should route, investigate, implement, and verify
the smallest appropriate change.

Preserve authentication, the Prisma schema, payment allocation, credit handling,
payment edit/delete reversal, email settings, cron jobs, Supabase/Vercel
configuration, and deployment assumptions unless the authoritative backend spec
explicitly changes them.

## Source Of Truth

1. `AGENTS.md` - durable project rules and source-of-truth hierarchy
2. `docs/AGENT_WORKFLOW.md` - shared Codex/Claude workflow, routing, evidence,
   question policy, and escalation rules
3. `docs/spec.md` - backend schema, auth, payment allocation, credit handling,
   email, cron, deployment
4. `docs/redesign.md` - current UX baseline, routes, navigation, naming, mobile
   behavior, demo behavior

Historical files:

- `TASKS.md` - completed Phase 2 task sequence; historical only
- `STATUS.md` - completed implementation history; historical only
- `docs/original-build-tasks.md` - completed original build plan; historical only

Conflict rules:

- `docs/spec.md` wins for schema, auth, payment allocation, email, cron, and
  deployment.
- `docs/redesign.md` wins for UI, navigation, routes, naming, mobile behavior,
  and demo behavior.
- `docs/AGENT_WORKFLOW.md` wins for how agents route, verify, ask questions, and
  stop/escalate.
- Historical files do not create active implementation requirements.

## Stack

- Next.js 15 (App Router, Server Actions)
- TypeScript (strict mode)
- pnpm (not npm)
- Prisma ORM + PostgreSQL via Supabase
- Supabase Auth (email/password + Google OAuth)
- shadcn/ui + Tailwind CSS
- Resend for email
- Vercel for deployment + cron jobs

## Conventions

- Money is always stored as integer cents. Never use FLOAT.
- All date fields use Prisma `@db.Date` with no time component.
- Month fields are always the first day of the month.
- Use Prisma enums for status fields, not duplicated string literals.
- Use Server Actions for mutations. API routes are reserved for cron jobs.
- Prefer existing components and backend helpers over parallel implementations.
- Commit messages use conventional commits: `feat:`, `fix:`, `chore:`.

## UX Principles

- Apply these rules to every screen, form, modal, and panel on both desktop and
  mobile.
- The app should feel native and mobile-first, not like a web admin table.
- Number fields use `inputmode="numeric"` so mobile shows the number pad.
- Dollar fields use `inputmode="decimal"`.
- Date and month inputs use native pickers where possible, not raw text fields.
- Auto-focus the first field when a modal or form opens.
- Enter and next advance naturally through fields. Multiline fields retain
  normal Enter behavior.
- Fields should flow naturally; never require unnecessary extra taps to activate
  the next input.
- The keyboard must not cover the active input. Scroll forms as needed so the
  focused field remains visible.
- Tappable elements must be at least 44x44px.
- Cards have a hover state on desktop and immediate tap or pressed feedback on
  mobile.
- Every non-dashboard page, modal, or panel has an obvious back or close control.
- Every screen has visible dashboard/back navigation, and the `Property Manager`
  brand links to the dashboard.
- Tapping outside a modal or slide-over closes it when dismissal is safe.
- Swipe-down closes mobile modals where the component supports it.
- No hamburger menu anywhere.
- Demo and real app must share components.
- The demo page and real app may differ only by data source, demo banner, and
  owner sign-in affordance. If they render differently otherwise, it is a bug.
- Prefer clear cards, sheets, and progressive disclosure over dense desktop
  tables on small screens.
- Use one responsive experience, not separate desktop and mobile feature sets.
  Layout may adapt, but behavior and available actions stay consistent.
- No feature should be hidden behind breakpoints; if it exists on desktop, it
  exists on mobile.
- Preserve accessible labels, keyboard navigation, visible focus states, and
  reduced-motion behavior.

## Working Rules

- Follow `docs/AGENT_WORKFLOW.md` for every product request.
- For user-facing requests, inspect the running product in the connected browser
  before asking questions or planning when browser access is available.
- Use the repository and current behavior to answer questions before asking the
  user.
- Ask only questions whose answers materially change the product outcome or
  implementation.
- Automatically select useful internal capabilities for diagnosis, product-intent
  resolution, browser QA, testing, and review. The user should not need to know
  capability or skill names.
- Use available browser, CLI, connected-application, database, deployment, and
  GitHub capabilities to complete and verify work end to end. Do not ask the
  user to perform an action the agent can safely perform.
- Implement the smallest appropriate change.
- Preserve unrelated working behavior and backend contracts.
- Follow the delivery instructions for the current request. Do not stage, commit,
  or push unless the user asks for it.
- Never push directly to `main` unless explicitly authorized.
- Do not expose credentials in commits, logs, screenshots, or documentation.
- Do not create permanent verification diaries unless explicitly asked.

## Verification

- Keep verification proportional to the change.
- Use focused checks while working; do not run a full build after every small
  iteration by default.
- Run `pnpm build` before declaring a source-code change merge-ready, before
  deployment, and whenever the change could affect compilation, routing,
  rendering, dependencies, or production behavior.
- Run focused lint/type checks when useful before the full build.
- Verify user-facing behavior through real browser interactions at relevant
  desktop and mobile viewports.
- Browser verification is required for claims about user-facing behavior.
- Check browser console state for user-facing changes.
- Verify relevant database state with direct Prisma queries when data behavior
  changes.
- Verify demo parity whenever shared UI changes.
- Report concise before/after evidence in the final response.
- If browser access or authenticated session is unavailable, report the
  limitation and do not claim browser-verified behavior.

## Anti-Patterns

- Never treat `TASKS.md` as active work unless the user explicitly reactivates it.
- Never rewrite working backend behavior to make a UI task easier.
- Never mock Supabase for acceptance testing.
- Never claim a user-facing bug is fixed without reproducible evidence.
- Never leave duplicate desktop/mobile implementations when a shared component
  can express both.
- Never use CSS alone to claim swipe support; implement pointer/touch behavior.
- Never save invalid inline edits.
- Never make lease end or rent changes outside a safe transaction.
- Never skip required verification before declaring work merge-ready.
- If the same blocker persists after two retries, stop and explain it.
