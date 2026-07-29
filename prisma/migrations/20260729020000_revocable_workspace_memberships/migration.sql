ALTER TABLE "WorkspaceMembership"
ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE INDEX "WorkspaceMembership_userId_revokedAt_idx"
ON "WorkspaceMembership"("userId", "revokedAt");
