-- Refuse to contract if the workspace-aware application left any unowned rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Property" WHERE "workspaceId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Tenant" WHERE "workspaceId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Lease" WHERE "workspaceId" IS NULL)
    OR EXISTS (SELECT 1 FROM "PaymentPeriod" WHERE "workspaceId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Payment" WHERE "workspaceId" IS NULL)
    OR EXISTS (SELECT 1 FROM "EmailLog" WHERE "workspaceId" IS NULL)
  THEN
    RAISE EXCEPTION 'Workspace contract blocked: customer-owned rows are missing workspace ownership';
  END IF;
END $$;

-- The only null-owned settings row is the preserved pre-workspace singleton.
DELETE FROM "AppSettings" WHERE "workspaceId" IS NULL;

ALTER TABLE "Property" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Tenant" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Lease" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "PaymentPeriod" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "EmailLog" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "replyToEmail" SET NOT NULL;

DROP INDEX "Payment_clientRequestId_key";
DROP INDEX "EmailLog_tenantId_triggerType_periodMonth_key";

-- Composite candidate keys let foreign keys enforce that a relationship never
-- crosses a workspace, even if a future application path misses a check.
CREATE UNIQUE INDEX "Property_id_workspaceId_key" ON "Property"("id", "workspaceId");
CREATE UNIQUE INDEX "Tenant_id_workspaceId_key" ON "Tenant"("id", "workspaceId");
CREATE UNIQUE INDEX "Lease_id_workspaceId_key" ON "Lease"("id", "workspaceId");
CREATE UNIQUE INDEX "PaymentPeriod_id_workspaceId_key" ON "PaymentPeriod"("id", "workspaceId");
CREATE UNIQUE INDEX "Payment_id_workspaceId_key" ON "Payment"("id", "workspaceId");

ALTER TABLE "Lease"
  ADD CONSTRAINT "Lease_property_workspace_fkey"
  FOREIGN KEY ("propertyId", "workspaceId")
  REFERENCES "Property"("id", "workspaceId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lease"
  ADD CONSTRAINT "Lease_tenant_workspace_fkey"
  FOREIGN KEY ("tenantId", "workspaceId")
  REFERENCES "Tenant"("id", "workspaceId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentPeriod"
  ADD CONSTRAINT "PaymentPeriod_lease_workspace_fkey"
  FOREIGN KEY ("leaseId", "workspaceId")
  REFERENCES "Lease"("id", "workspaceId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_lease_workspace_fkey"
  FOREIGN KEY ("leaseId", "workspaceId")
  REFERENCES "Lease"("id", "workspaceId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentPeriod"
  ADD CONSTRAINT "PaymentPeriod_payment_workspace_fkey"
  FOREIGN KEY ("paymentId", "workspaceId")
  REFERENCES "Payment"("id", "workspaceId")
  ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_tenant_workspace_fkey"
  FOREIGN KEY ("tenantId", "workspaceId")
  REFERENCES "Tenant"("id", "workspaceId")
  ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_lease_workspace_fkey"
  FOREIGN KEY ("leaseId", "workspaceId")
  REFERENCES "Lease"("id", "workspaceId")
  ON DELETE SET NULL ("leaseId") ON UPDATE CASCADE;

-- Enforce that a surviving workspace always has at least one owner. Deferring
-- the check lets whole-workspace deletion cascade cleanly.
CREATE OR REPLACE FUNCTION prevent_ownerless_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Workspace" WHERE "id" = OLD."workspaceId")
    AND NOT EXISTS (
      SELECT 1
      FROM "WorkspaceMembership"
      WHERE "workspaceId" = OLD."workspaceId"
        AND "role" = 'OWNER'
    )
  THEN
    RAISE EXCEPTION 'A workspace must retain at least one owner';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "WorkspaceMembership_final_owner_guard"
AFTER DELETE OR UPDATE OF "role", "workspaceId"
ON "WorkspaceMembership"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION prevent_ownerless_workspace();
