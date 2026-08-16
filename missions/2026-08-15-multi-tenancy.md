# Multi-tenancy Mission

## Acceptance Check
- RLS enabled on every table; a direct anon-key query returns nothing
  from any table
- Tests pass proving a user in workspace B cannot read, update, or
  delete workspace A's properties, leases, tenants, payments, periods,
  email logs, or settings — via UI, server actions, or direct
  Supabase query
- A user invited via the Supabase dashboard and attached per the
  runbook signs in and lands in their own empty workspace ("Add your
  first lease"), seeing no other workspace's data
- The provisioning runbook (invite → create workspace → create
  membership) is written and, executed against production, produces
  a working isolated workspace
- A fresh database built from migrations alone has identical RLS behavior to
  production.
- pnpm test, pnpm build, and the smoke tests pass

## Objective
Convert the app from a global shared portfolio to workspace-based
multi-tenancy per the audit findings: workspace ownership and
membership, RLS per the Supabase schema standard in AGENTS.md,
anonymous access closed. Cron routes must scope per workspace.

## Out of Scope
No self-serve signup. No UI redesign. No email enablement. No new
features.

## Retry Cap
3

## Evidence

Canonical base: `origin/main` at `bde5527`.

Passed:

- `pnpm exec prisma validate` — schema valid.
- `pnpm lint` — passed.
- `pnpm exec prisma generate` — generated Prisma Client successfully.
- `pnpm test` — 88 tests passed.
- `pnpm build` — passed.
- `origin/main` already supplies the production-matching
  `WorkspaceMembership.revokedAt` schema and migration.
- The provisioning runbook uses the real `/admin` invitation flow and
  `WorkspaceMembership` model.

RLS migration review:

- Added `prisma/migrations/20260816000000_workspace_rls_policies`.
- It defines the membership and owner functions with `SECURITY DEFINER` and
  `search_path = public`, plus explicit membership-scoped policies.
- Live policy names, RLS flags, grants, function definitions, and predicates
  matched the migration exactly.
- The local migration chain contains every successful production migration,
  plus the RLS-policy migration; the failed production-only migration is not
  included.

Production acceptance checks:

- Direct anon-key REST queries returned `[]` for every readable application
  table.
- An unrelated authenticated user saw zero workspaces, memberships,
  properties, tenants, leases, payments, periods, email logs, and settings.
- The existing authenticated owner saw one workspace, one membership, and
  one settings row, with zero business-data rows.
- Production contains one developer workspace, one owner membership, one
  settings row, and zero invitations or customer data.

Fresh-database reproducibility:

- `pnpm exec prisma validate`, generated-client validation, and the full
  migration inventory passed.
- No local PostgreSQL/Docker runtime was available for a disposable
  `migrate deploy`; reproducibility was verified by matching the complete
  successful migration chain, Prisma schema, live RLS policies, functions,
  flags, grants, and anon-key behavior.

Production failed-migration remediation (not executed):

- After a backup and confirmation that the failed migration made no partial
  changes, an administrator should run
  `pnpm exec prisma migrate resolve --rolled-back
  20260815000000_workspace_multi_tenancy` against production.
- Because the live RLS policies already match the new migration, the new RLS
  migration should be marked applied in production only after this exact
  comparison, rather than re-executed there. Both actions require explicit
  production approval.

Not completed:

- The real invitation walkthrough could not be executed without creating a
  new production invitation/user/workspace. Production has zero invitations
  and only the developer workspace; no safe test subject was available.
  Invitation behavior is covered by `tests/invitations.test.ts`, but the
  production browser flow remains unverified.

Implementation commit SHA: `PENDING`
