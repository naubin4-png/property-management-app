# Workspace provisioning runbook

Standing production test account: `clawmarket65@gmail.com`. Use it only for
repeatable onboarding and workspace-isolation verification; do not record its
credentials in the repository.

1. In the Supabase dashboard, invite the user by email. Do not enable public
   signup. The user must use the invited Google account for sign-in.
2. In the platform admin screen (`/admin`), create a workspace invitation for
   the same Gmail address. This creates the workspace and a pending
   `WorkspaceInvitation`; do not insert membership rows manually.
3. The user signs in with Google. The callback redeems the pending invitation
   transactionally and creates their `WorkspaceMembership` and `AppSettings`.
4. If a controlled SQL check is needed, use the production database SQL editor
   or an administrative connection to read the resulting rows. These queries
   do not create or change data:

```sql
select id, name from "Workspace" where id = '<workspace-id>';

select "workspaceId", "userId", role, "revokedAt"
from "WorkspaceMembership"
where "workspaceId" = '<workspace-id>' and "userId" = '<auth-user-id>';

select "workspaceId", "emailEnabled"
from "AppSettings"
where "workspaceId" = '<workspace-id>';

select 'Property' as table_name, count(*) as row_count
from "Property" where "workspaceId" = '<workspace-id>'
union all
select 'Tenant', count(*)
from "Tenant" where "workspaceId" = '<workspace-id>'
union all
select 'Lease', count(*)
from "Lease" where "workspaceId" = '<workspace-id>'
union all
select 'PaymentPeriod', count(*)
from "PaymentPeriod" where "workspaceId" = '<workspace-id>'
union all
select 'Payment', count(*)
from "Payment" where "workspaceId" = '<workspace-id>'
union all
select 'EmailLog', count(*)
from "EmailLog" where "workspaceId" = '<workspace-id>';
```

5. Confirm the workspace has an `AppSettings` row after the first login.
6. Confirm the dashboard says “Add your first lease” and that a property from
   another workspace is not visible.

Do not run the SQL with the anon key. Record the workspace ID, user ID, and
verification results in the deployment change record without recording
credentials.
