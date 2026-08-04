# Operations

This file contains Property Manager-specific commands and provider contracts.
Use the installed Software Factory/gstack skills for generic review, PR,
deployment, and QA procedure.

## Environments and required configuration

Production URL: <https://property-management-app-virid.vercel.app>

| Variable | Purpose | Production | Preview |
|---|---|---:|---:|
| `DATABASE_URL` | Supabase transaction pooler, port 6543 | required | absent |
| `DIRECT_URL` | Supabase session pooler/direct migration path, port 5432 | required | absent |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | required | required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser auth client | required | required |
| `NEXT_PUBLIC_APP_URL` | canonical auth origin | required | preview URL |
| `CRON_SECRET` | cron bearer authentication | required | absent |
| `PLATFORM_ADMIN_USER_ID` | stable Supabase admin UUID | required | absent |
| `RESEND_API_KEY` | tenant-email provider | when activated | absent |
| `EMAIL_FROM` | verified sender | when activated | absent |
| `RESEND_WEBHOOK_SECRET` | signed delivery webhook | when activated | absent |

Never place production database, cron, platform-admin, or email-provider secrets
in Preview deployments. Environment files are ignored and must be mode 600.

## Deployments and migrations

Vercel deploys production from `main`. For a migration:

1. Review the SQL and compatibility order. Apply additive changes before code
   that requires them; schedule destructive changes separately.
2. Pull Production variables into `.env.production.local` and set mode 600.
3. Confirm the connection roles and run:

   ```bash
   set -a
   source .env.production.local
   set +a
   pnpm exec prisma migrate deploy
   pnpm exec prisma migrate status
   ```

4. After merge, wait for Vercel Ready, verify the affected production journey,
   and inspect runtime errors without printing secrets.

Current schedules are defined only in `vercel.json`. Cron handlers require both
`Authorization: Bearer ${CRON_SECRET}` and `x-vercel-cron: 1`.

## Authenticated production QA

Production login remains Google-only. Do not add a password form or public QA
bypass. From an isolated worktree linked to Vercel and Supabase:

```bash
vercel link --yes --project property-management-app
vercel env pull .env.production.local --yes --environment=production
chmod 600 .env.production.local
node scripts/qa-session.mjs create [slot]
node scripts/qa-session.mjs open [slot]
node scripts/qa-session.mjs cleanup [slot|all]
```

The script retrieves the service role through the authenticated Supabase CLI
without printing it, creates a temporary user/workspace and one-time verifier,
stores cleanup IDs in ignored `.qa/session[-slot].json`, and establishes an
HttpOnly browser session through `/auth/confirm`.

- Never print, copy, inspect, log, or screenshot magic links, cookies, tokens,
  credentials, or sensitive DOM values.
- Use named slots only for genuine concurrent-workspace isolation tests.
- Always run cleanup, even after failed QA, and verify the `.qa` session file is
  gone. QA identities are not invitations or email recipients.
- Use a genuine second Google identity for Google-specific invitation behavior;
  a QA session does not prove OAuth account selection.

## Tenant-email activation

Until a sending domain is ready, leave all three Resend variables unset and both
tenant-email controls off. Automated tests use a fake delivery dependency.

To activate:

1. Verify the client-owned domain in Resend and publish the exact SPF and DKIM
   records. Publish a DMARC policy for the organizational domain.
2. Create a production-only sending key and a webhook for
   `/api/webhooks/resend`, subscribed to sent, delayed, delivered, failed,
   suppressed, bounced, and complained events.
3. Add `RESEND_API_KEY`, a verified-domain `EMAIL_FROM`, and
   `RESEND_WEBHOOK_SECRET` to Vercel Production, then redeploy.
4. Confirm the Tenant emails page reports the provider ready. Set the workspace
   reply-to address and enable the desired reminder controls.
5. Send one synthetic reminder only to an owner-authorized recipient. Verify
   Accepted becomes Delivered through the signed webhook; exercise failure,
   retry, bounce, and duplicate prevention without using a real tenant.
6. Remove the synthetic lease and delivery records before enabling the client
   workspace.

Immediate email stop: disable both workspace controls. Global stop: remove
`RESEND_API_KEY` and redeploy.

## Backups and recovery

Before storing client data, Supabase must be on a paid plan that does not pause
for inactivity and provides retained scheduled backups. The minimum owner action
is to enable Supabase Pro and confirm daily backups with at least seven-day
retention in the production dashboard.

Recovery drills restore into a separate Supabase project, apply later Prisma
migrations, configure Auth without copying secrets into Git, and compare
workspace, membership, property, lease, payment, settings, and email-log counts.
Never overwrite production without explicit owner approval and a separately
verified recovery point.

For independent encrypted backups, use `pg_dump` or `supabase db dump` against
`DIRECT_URL` and test restoration into matching-version empty PostgreSQL.

## Diagnosis and emergency controls

Inspect recent Vercel production failures without secret-bearing output:

```bash
vercel logs --project property-management-app --environment production \
  --level error --since 24h --limit 100 --no-branch
```

- Authentication: keep Google identity creation available; invitation and
  membership checks enforce access. Revoke the invitation or membership rather
  than disabling Google globally.
- Compromised OAuth secret: configure a replacement, verify a complete Google
  login, then revoke the old secret.
- Database: stop writes at the application/deployment layer before recovery.
- Logs must not contain tenant addresses, message bodies, credentials, cookies,
  magic links, or tokens.
