-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'REDEEMED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "redeemedUserId" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- Expand first: these remain nullable until the workspace-aware application is
-- deployed. This keeps the currently running release compatible during rollout.
ALTER TABLE "Property" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Lease" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "PaymentPeriod" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "AppSettings"
  ADD COLUMN "workspaceId" TEXT,
  ADD COLUMN "replyToEmail" TEXT,
  ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "id" DROP DEFAULT;

CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");
CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
CREATE INDEX "WorkspaceInvitation_email_status_idx" ON "WorkspaceInvitation"("email", "status");
CREATE INDEX "WorkspaceInvitation_workspaceId_idx" ON "WorkspaceInvitation"("workspaceId");
CREATE INDEX "Property_workspaceId_idx" ON "Property"("workspaceId");
CREATE INDEX "Tenant_workspaceId_idx" ON "Tenant"("workspaceId");
CREATE INDEX "Lease_workspaceId_idx" ON "Lease"("workspaceId");
CREATE INDEX "PaymentPeriod_workspaceId_idx" ON "PaymentPeriod"("workspaceId");
CREATE INDEX "Payment_workspaceId_idx" ON "Payment"("workspaceId");
CREATE INDEX "EmailLog_workspaceId_idx" ON "EmailLog"("workspaceId");
CREATE UNIQUE INDEX "Payment_workspaceId_clientRequestId_key" ON "Payment"("workspaceId", "clientRequestId");
CREATE UNIQUE INDEX "EmailLog_workspaceId_tenantId_triggerType_periodMonth_key" ON "EmailLog"("workspaceId", "tenantId", "triggerType", "periodMonth");
CREATE UNIQUE INDEX "AppSettings_workspaceId_key" ON "AppSettings"("workspaceId");

ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deny browser-facing PostgREST roles. The server uses Prisma with its
-- privileged connection and still enforces workspace authorization in code.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSettings" ENABLE ROW LEVEL SECURITY;

-- Bootstrap the permanent developer workspace without granting platform-admin
-- access to any future customer workspace.
INSERT INTO "Workspace" ("id", "name", "timezone", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Developer Test Workspace', 'America/New_York', CURRENT_TIMESTAMP);

INSERT INTO "WorkspaceMembership" ("id", "workspaceId", "userId", "role", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '1d451862-c2fd-4a0a-b7f0-61dd69ffe614',
  'OWNER',
  CURRENT_TIMESTAMP
);

INSERT INTO "AppSettings" ("id", "workspaceId", "replyToEmail", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'naubin4@gmail.com',
  CURRENT_TIMESTAMP
);
