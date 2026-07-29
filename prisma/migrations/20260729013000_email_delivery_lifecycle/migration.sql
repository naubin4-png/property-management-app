CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'PROCESSING',
  'ACCEPTED',
  'DELIVERED',
  'FAILED',
  'BOUNCED',
  'COMPLAINED'
);

ALTER TABLE "EmailLog"
  ADD COLUMN "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PROCESSING',
  ADD COLUMN "lastEventAt" TIMESTAMP(3);

UPDATE "EmailLog"
SET "status" = CASE
  WHEN "error" IS NULL THEN 'ACCEPTED'::"EmailDeliveryStatus"
  ELSE 'FAILED'::"EmailDeliveryStatus"
END;

CREATE INDEX "EmailLog_resendMessageId_idx" ON "EmailLog"("resendMessageId");
CREATE UNIQUE INDEX "EmailLog_id_workspaceId_key"
  ON "EmailLog"("id", "workspaceId");

CREATE TABLE "EmailWebhookEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "emailLogId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailWebhookEvent_providerEventId_key"
  ON "EmailWebhookEvent"("providerEventId");
CREATE INDEX "EmailWebhookEvent_workspaceId_idx"
  ON "EmailWebhookEvent"("workspaceId");
CREATE INDEX "EmailWebhookEvent_emailLogId_idx"
  ON "EmailWebhookEvent"("emailLogId");

ALTER TABLE "EmailWebhookEvent"
  ADD CONSTRAINT "EmailWebhookEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailWebhookEvent"
  ADD CONSTRAINT "EmailWebhookEvent_emailLogId_fkey"
  FOREIGN KEY ("emailLogId", "workspaceId")
  REFERENCES "EmailLog"("id", "workspaceId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailWebhookEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "EmailWebhookEvent" FROM anon, authenticated;
