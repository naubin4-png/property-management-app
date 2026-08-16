-- Reproduce the production workspace access boundary.  These policies are
-- intentionally explicit: browser roles have no anonymous access, and an
-- authenticated user can only access rows in an active workspace membership.

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."WorkspaceMembership" wm
    WHERE wm."workspaceId" = target_workspace_id
      AND wm."userId" = auth.uid()
      AND wm."revokedAt" IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."WorkspaceMembership" wm
    WHERE wm."workspaceId" = target_workspace_id
      AND wm."userId" = auth.uid()
      AND wm."role" = 'OWNER'::"MembershipRole"
      AND wm."revokedAt" IS NULL
  );
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.is_workspace_member(text) FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_workspace_owner(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(text) TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Workspace", "WorkspaceMembership", "WorkspaceInvitation", "Property",
  "Tenant", "Lease", "PaymentPeriod", "Payment", "EmailLog", "AppSettings"
TO authenticated;
GRANT SELECT ON TABLE
  "Workspace", "WorkspaceMembership", "WorkspaceInvitation", "Property",
  "Tenant", "Lease", "PaymentPeriod", "Payment", "EmailLog", "AppSettings"
TO anon;

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_member_access ON "Workspace"
  FOR ALL TO authenticated
  USING (public.is_workspace_member(id))
  WITH CHECK (public.is_workspace_member(id));

CREATE POLICY workspace_membership_select ON "WorkspaceMembership"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid() OR public.is_workspace_member("workspaceId"));
CREATE POLICY workspace_membership_insert ON "WorkspaceMembership"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner("workspaceId"));
CREATE POLICY workspace_membership_update ON "WorkspaceMembership"
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner("workspaceId"))
  WITH CHECK (public.is_workspace_owner("workspaceId"));
CREATE POLICY workspace_membership_delete ON "WorkspaceMembership"
  FOR DELETE TO authenticated
  USING (public.is_workspace_owner("workspaceId"));

CREATE POLICY workspace_invitation_select ON "WorkspaceInvitation"
  FOR SELECT TO authenticated
  USING (public.is_workspace_member("workspaceId"));
CREATE POLICY workspace_invitation_insert ON "WorkspaceInvitation"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner("workspaceId"));
CREATE POLICY workspace_invitation_update ON "WorkspaceInvitation"
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner("workspaceId"))
  WITH CHECK (public.is_workspace_owner("workspaceId"));
CREATE POLICY workspace_invitation_delete ON "WorkspaceInvitation"
  FOR DELETE TO authenticated
  USING (public.is_workspace_owner("workspaceId"));

CREATE POLICY property_workspace_access ON "Property"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY tenant_workspace_access ON "Tenant"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY lease_workspace_access ON "Lease"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY period_workspace_access ON "PaymentPeriod"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY payment_workspace_access ON "Payment"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY email_log_workspace_access ON "EmailLog"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
CREATE POLICY settings_workspace_access ON "AppSettings"
  FOR ALL TO authenticated
  USING (public.is_workspace_member("workspaceId"))
  WITH CHECK (public.is_workspace_member("workspaceId"));
