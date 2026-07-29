# Production Operations

## Launch gates

Before inviting a client:

- Supabase must be on a paid plan that does not pause for inactivity and includes
  retained scheduled backups. Do not change the plan without owner approval.
- Supabase Authentication must allow new identities, keep anonymous sign-in
  disabled, and keep Google enabled. Property Manager remains invite-only
  because workspace access is enforced by verified Google identity and a
  matching invitation.
- The Google OAuth audience must be External and In production. The only
  authorized Google redirect URI is the Supabase callback shown in the Supabase
  Google provider panel.
- Production must have `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`,
  `PLATFORM_ADMIN_USER_ID`, `NEXT_PUBLIC_APP_URL`, and the two public Supabase
  variables. Preview deployments intentionally have no database URL, cron
  secret, platform-admin UUID, or email-provider secrets.
- Tenant email must remain disabled until every step in
  [email-activation.md](email-activation.md) is complete.

## Deployments and migrations

Vercel production deploys from `main`. Before merging a migration PR:

1. Pull production variables into an ignored mode-600
   `.env.production.local`.
2. Confirm `DIRECT_URL` uses the Supabase session pooler on port 5432.
   `DATABASE_URL` remains the transaction pooler on port 6543.
3. Review the SQL and apply additive/compatible migrations before the code that
   requires them:

   ```sh
   set -a
   source .env.production.local
   set +a
   pnpm prisma migrate deploy
   pnpm prisma migrate status
   ```

4. Merge only after tests, lint, build, dependency audit, and Vercel checks pass.
5. Wait for the production deployment status to be Ready, then verify the
   affected route in the browser and inspect runtime logs.

Never give a preview deployment production database credentials merely to make
preview authentication convenient. Use the revocable production QA procedure
in `docs/AGENT_WORKFLOW.md` for authenticated acceptance testing.

## Backups and restore

On Supabase Pro, the production dashboard should show daily scheduled backups
with seven-day retention. A practical recovery drill is:

1. Restore the selected backup to a new Supabase project when that option is
   available. Do not overwrite production during a drill.
2. Apply any later Prisma migrations to the restored project.
3. copy the production Auth URL/provider configuration without copying secrets
   into source control.
4. Point a temporary local environment at the restored project.
5. Verify membership, property, lease, payment, settings, and email-log counts,
   then run the critical read-only journeys.
6. Delete the drill project only after the owner confirms the results.

For an independent logical backup, use `pg_dump` or `supabase db dump` with the
session-pooler `DIRECT_URL`. Store the resulting schema/data files encrypted
outside the repository. Test restore into an empty temporary Postgres database
with the matching major version. The Supabase CLI dump command requires Docker
or compatible local Postgres tooling; verify that prerequisite before relying
on this path during an incident.

## Cron and runtime diagnosis

Vercel schedules are defined in `vercel.json`. Cron handlers require both the
Vercel cron header and `Authorization: Bearer ${CRON_SECRET}`. A missing header
must return 401.

Inspect recent failures without printing secrets:

```sh
vercel logs \
  --project property-management-app \
  --environment production \
  --level error \
  --since 24h \
  --limit 100 \
  --no-branch
```

Filter cron traffic with `--query '/api/cron/'` or `--status-code 5xx`. Vercel
Free log retention is short, so investigate alerts promptly. Application logs
must not include tenant addresses, message bodies, credentials, cookies, magic
links, or tokens.

## Emergency controls

- Email: turn off workspace delivery. For a global stop, remove
  `RESEND_API_KEY` and redeploy.
- Authentication: do not disable Google or new identity creation as a substitute
  for invite enforcement; that blocks legitimate first-time invitees. Revoke an
  invitation or membership instead.
- Database: stop writes at the application/deployment layer before recovery.
  Never restore a backup over production without explicit owner approval and a
  separately verified recovery point.
- Compromised OAuth secret: create and configure a replacement first, verify a
  complete Google login, then disable and delete the old secret.
