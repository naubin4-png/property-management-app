# AGENTS.md

## Project

Property Manager is a rent tracker for a single owner with roughly 40-60
commercial leases. The original build is complete, deployed, and archived in
`docs/original-build-tasks.md`.

Phase 2 is a UI/UX redesign of the working application, not a rebuild. Preserve
authentication, the Prisma schema, payment allocation, credit handling, payment
edit/delete reversal, email settings, cron jobs, Supabase/Vercel configuration,
and deployment assumptions unless the authoritative backend spec explicitly
changes them.

Complete the active tasks in `TASKS.md` sequentially. Do not skip ahead. Update
`STATUS.md`, run all required verification, commit, and push after each task.

## Source of Truth

1. `AGENTS.md` - global coding rules, source-of-truth hierarchy, UX principles
2. `docs/spec.md` - backend schema, auth, payment allocation, credit handling,
   email, cron, deployment
3. `docs/redesign.md` - UI, routes, navigation, naming, mobile behavior, demo
   behavior
4. `TASKS.md` - active Phase 2 implementation sequence

Conflict rules:

- `docs/redesign.md` wins for UI, navigation, routes, naming, mobile behavior,
  and demo behavior.
- `docs/spec.md` wins for schema, auth, payment allocation, email, cron, and
  deployment.
- `TASKS.md` wins only for implementation order.

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

- The app should feel native and mobile-first, not like a web admin table.
- Number fields use `inputmode="numeric"`.
- Dollar fields use `inputmode="decimal"`.
- Date and month inputs use native pickers where possible.
- Auto-focus the first field when a modal or form opens.
- Enter and next advance naturally through fields.
- The keyboard must not cover the active input.
- Tappable elements must be at least 44x44px.
- Every non-dashboard page, modal, or panel has an obvious back or close control.
- No hamburger menu anywhere.
- Demo and real app must share components.
- Prefer clear cards, sheets, and progressive disclosure over dense desktop
  tables on small screens.
- Preserve accessible labels, keyboard navigation, visible focus states, and
  reduced-motion behavior.

## Tools and Access

- Prefer CLI tools for code, database checks, builds, and deployment inspection.
- Use the browser for real user-flow and responsive verification.
- Never ask the user to perform an action available through the CLI or browser.
- Do not expose credentials in commits, logs, screenshots, or documentation.

## Testing Before Each Commit

- Run `pnpm build`; it must pass.
- Run focused lint/type checks when useful before the full build.
- Start the app and test the task's real user flows in the browser.
- Test at desktop and 375px mobile widths for user-facing changes.
- Verify relevant database state with direct Prisma queries.
- Verify demo parity whenever shared UI changes.
- Check for browser console errors.

## Definition of Done for Each Task

- The task checklist in `TASKS.md` is satisfied.
- `pnpm build` passes.
- Browser behavior is verified through actual interactions.
- Relevant database state is correct.
- No debug code, `console.log`, TODO comments, or dead code remains.
- `STATUS.md` records the completed task and verification.
- A focused conventional commit is pushed to `main`.

## Anti-Patterns

- Never rewrite working backend behavior to make a UI task easier.
- Never mock Supabase for acceptance testing.
- Never mark a task complete without browser verification.
- Never leave duplicate desktop/mobile implementations when a shared component
  can express both.
- Never use CSS alone to claim swipe support; implement pointer/touch behavior.
- Never save invalid inline edits.
- Never make lease end or rent changes outside a safe transaction.
- Never skip `pnpm build` before a commit.
- If the same blocker persists after two retries, stop and explain it.
