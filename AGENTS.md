# Property Manager agent contract

Property Manager is a deployed, invite-only commercial rent tracker for small
landlords. Treat this file as the automatic repository entrypoint.

## Read first

- [README.md](README.md) for setup and the documentation map.
- [docs/product.md](docs/product.md) for current product behavior and language.
- [docs/architecture.md](docs/architecture.md) before changing data, auth,
  payments, tenant email, cron, or workspace access.
- [docs/operations.md](docs/operations.md) before provider, migration,
  production, backup, or authenticated-QA work.

## Operating charter

- Understand the current product behavior and relevant contracts before
  editing. Use source, tests, and the running product as evidence.
- Define the user-visible outcome before choosing an implementation.
- Prefer the simplest coherent solution. Make surgical changes and preserve
  unrelated behavior.
- Apply a product concept consistently across every affected surface, including
  demo and authenticated experiences.
- Run and test the actual product when behavior is user-facing; code-level
  proxies alone do not prove the journey works.
- Verify the complete affected journey and its important error, boundary,
  concurrency, authorization, desktop, and mobile cases in proportion to risk.
- Review the final diff for unintended files, stale assumptions, security or
  financial regressions, and missing verification before handing it off.
- Add durable repository guidance only when a failure is recurring and specific
  to Property Manager. Do not turn one-off task history into instructions.

Choose the tools and engineering approach that best fit the task. These
principles define the outcome and safety boundary, not a universal sequence.

## Durable constraints

- Use `pnpm`, Next.js App Router, strict TypeScript, Prisma, PostgreSQL on
  Supabase, Supabase Auth, Resend, and Vercel.
- Store money as integer cents. Never use floating-point database columns.
- Store rent months and payment dates as Prisma `@db.Date`; rent months are the
  first day of the month.
- Scope every customer read and mutation by the authenticated workspace on the
  server. Never trust browser-supplied workspace or user ownership claims.
- Preserve oldest-first payment allocation, immutable period rent snapshots,
  computed credit, idempotent payment creation, and transactional payment
  edit/delete reversal.
- Preserve invite-only Google authentication, revocable memberships, database
  privilege restrictions, and the side-effect-safe public demo.
- Tenant email stays fail-closed unless its workspace controls and all required
  provider configuration are enabled. Cron jobs and webhooks remain
  authenticated and idempotent.
- Use Server Actions for application mutations. API routes are for cron,
  webhook, and authentication callbacks.
- Demo and authenticated product surfaces share components. Differences are
  limited to sample data, authentication, persistence, and external side
  effects.
- Keep one responsive feature set. Do not hide behavior by breakpoint; retain
  accessible labels, keyboard operation, visible focus, 44px targets, native
  date inputs, and appropriate mobile input modes.

Do not change application behavior to satisfy old documentation. If code,
provider behavior, and these contracts disagree, investigate the live contract
and update the appropriate source deliberately.
