# AGENTS.md

## Project

Property management rent tracker for a single owner with ~40–60 commercial leases. Full technical spec in `docs/spec.md`. Read it before starting any task.

Task list with completion checklists in `TASKS.md`. The plan is immutable — never edit TASKS.md. Track progress in `STATUS.md` only.

Complete tasks sequentially. Do not skip ahead.

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

- Money is always stored as integer cents. Display: `(cents / 100).toFixed(2)`. Never use FLOAT.
- All date fields use Prisma `@db.Date` (no time component).
- All month fields (firstPeriodMonth, lastPeriodMonth, periodMonth) are always the 1st of the month.
- Use Prisma enums for status fields (`PeriodStatus`, `TriggerType`), not string literals.
- Server Actions for mutations. No API routes except cron jobs.
- Commit messages use conventional commits: `feat:`, `fix:`, `chore:`.

## Tools and Access

- Prefer CLI (pnpm, git, npx, curl) when possible — faster and more reliable.
- Use browser only when CLI access isn't available.
- If you need credentials or access you don't have (API keys, account setup, domain verification), use the browser to get them, then return to CLI with those credentials.
- Never ask the user to do something you can do yourself through CLI or browser.

## Environment Setup

Before starting Task 1, use the browser to:

1. Create a Supabase project (free tier). Note:
   - `DATABASE_URL` (pooled connection, port 6543, append `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (direct connection, port 5432)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. In Supabase: Authentication → Providers → enable Google OAuth.
3. In Supabase: Authentication → Settings → disable "Allow new users to sign up."
4. Create a Resend account. Verify the domain. Note `RESEND_API_KEY`.
5. Set `EMAIL_FROM` to match the verified Resend domain (e.g. `reminders@yourdomain.com`).
6. Generate `CRON_SECRET` with `openssl rand -hex 32`.
7. Create `.env.local` in the repo root with all values.

## Testing Before Each Commit

- Run `pnpm build` — must compile without errors.
- Start dev server (`pnpm dev`).
- Test the feature in the browser — go through the actual user flows that the task built.
- Verify the database has the right data via `npx prisma studio` or direct query.
- If it works → commit and push. If it fails → fix and retry.
- Never commit code that doesn't compile or that you haven't tested.

## Definition of Done for Each Task

- Code compiles (`pnpm build` passes).
- Feature works in the browser (tested by clicking through it).
- Database state is correct (verified via Prisma Studio or direct query).
- No debug code, console.logs, TODOs, or dead code left behind.
- Commit message is clear and descriptive (conventional commit format).
- Changes are pushed to main.
- STATUS.md updated with task completion and any notes.

## Anti-Patterns — Never Do These

- Never edit TASKS.md. The plan is immutable. Track progress in STATUS.md only.
- Never mock the database. Test against real Supabase.
- Never build a fake test harness or stub services. Test through the actual app UI.
- Never mark a task done without testing the feature in the browser.
- Never add feature flags, fallback handlers, or "legacy" code paths. Build it right once.
- Never leave debug logging, console.logs, or TODO comments in committed code.
- Never skip `pnpm build` before committing.

- Read the error message carefully.
- Fix the code or configuration.
- Retry the operation.
- If stuck after 2 retries, stop and explain the issue. Do not keep looping.
- Never commit broken code.
