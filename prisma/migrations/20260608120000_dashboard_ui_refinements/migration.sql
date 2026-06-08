ALTER TABLE "Lease"
ADD COLUMN "dashboardNote" TEXT;

ALTER TABLE "AppSettings"
DROP COLUMN "reminderEnabled";
