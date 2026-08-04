# Architecture contract

## System boundary

- Next.js 15 App Router renders the product and uses Server Actions for normal
  mutations.
- Prisma accesses PostgreSQL hosted by Supabase. Supabase Auth supplies the
  verified Google identity and HttpOnly session.
- Vercel deploys `main` and schedules cron routes. Resend sends tenant mail and
  signs delivery webhooks.
- The public demo uses session-local sample state and never customer tables or
  external delivery side effects.

The Prisma schema and checked-in migrations are the executable schema source of
truth. This document records invariants rather than duplicating every field.

## Tenancy and authorization

- `Workspace` owns customer data, settings, and email history.
- `WorkspaceMembership` grants `OWNER` or `MEMBER` access and can be revoked
  immediately through `revokedAt`.
- `WorkspaceInvitation` is normalized by email, expires after 14 days, is
  revocable, single-use, and redeemed atomically by a matching verified Google
  identity.
- Server code derives `userId` and `workspaceId` from the authenticated session
  and active membership. Customer record lookups include `workspaceId`.
- Browser-facing database roles have no direct application-table privileges;
  RLS remains defense in depth behind privileged Prisma access.
- Platform administration is authorized by a configured stable Supabase user
  UUID, not by a browser claim or email string.

## Financial model

- `PaymentPeriod` is one monthly obligation. `amountDueCents` is an immutable
  historical rent snapshot; `(leaseId, periodMonth)` is unique.
- `Payment` stores received cash. `clientRequestId` is unique per workspace.
- Credit is computed as total payments minus total rent allocated to received
  periods. It is never stored separately.
- Allocation runs in a serializable transaction, combines credit with the new
  payment, and covers complete unpaid periods oldest first.
- `paymentId` identifies the periods covered by a payment so edit/delete can
  reverse exactly that allocation before reallocation or deletion.
- Rent, lease-end, and period generation changes remain transactional. Calendar
  decisions use the workspace timezone; persisted month/date values use
  `@db.Date`.

## Tenant email and scheduled work

- `AppSettings` is one row per workspace and includes reminder controls, copy,
  grace period, reply-to address, and the provider enablement state.
- Delivery requires workspace enablement plus `RESEND_API_KEY`, `EMAIL_FROM`,
  and `RESEND_WEBHOOK_SECRET`. Missing configuration fails closed.
- `EmailLog` deduplicates a tenant, trigger, and period within a workspace.
  Failed sends may be claimed for retry; Resend idempotency keys guard provider
  submission.
- `EmailWebhookEvent.providerEventId` is unique. Signed webhook processing is
  idempotent and preserves monotonic/terminal delivery outcomes.
- Cron routes require both the bearer `CRON_SECRET` and Vercel cron header.
  Schedules in `vercel.json` are authoritative.

## Change rules

- Add or modify schema only through checked-in Prisma migrations.
- Keep `DATABASE_URL` on the transaction pooler and `DIRECT_URL` on the session
  pooler/direct migration path described in operations.
- Preserve referential deletion behavior and compound workspace constraints.
- Treat changes to auth, allocation, reversal, email deduplication, cron auth,
  or workspace isolation as high-risk and verify their dedicated regression
  tests plus the relevant production journey.
