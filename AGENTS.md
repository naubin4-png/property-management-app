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
