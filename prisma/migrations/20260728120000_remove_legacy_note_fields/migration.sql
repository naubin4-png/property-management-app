WITH ranked_leases AS (
  SELECT
    l.id,
    l."propertyId",
    ROW_NUMBER() OVER (
      PARTITION BY l."propertyId"
      ORDER BY
        CASE
          WHEN l."lastPeriodMonth" IS NULL THEN 1
          ELSE 0
        END DESC,
        l."firstPeriodMonth" DESC,
        l."createdAt" DESC
    ) AS rank
  FROM "Lease" l
),
remaining_property_notes AS (
  SELECT
    ranked_leases.id AS lease_id,
    NULLIF(TRIM(p.notes), '') AS property_note,
    NULLIF(TRIM(l.notes), '') AS lease_note
  FROM ranked_leases
  JOIN "Property" p ON p.id = ranked_leases."propertyId"
  JOIN "Lease" l ON l.id = ranked_leases.id
  WHERE ranked_leases.rank = 1
    AND NULLIF(TRIM(p.notes), '') IS NOT NULL
)
UPDATE "Lease"
SET notes =
  CASE
    WHEN remaining_property_notes.lease_note IS NULL THEN remaining_property_notes.property_note
    WHEN remaining_property_notes.lease_note = remaining_property_notes.property_note THEN remaining_property_notes.lease_note
    ELSE remaining_property_notes.lease_note || E'\nProperty note: ' || remaining_property_notes.property_note
  END
FROM remaining_property_notes
WHERE "Lease".id = remaining_property_notes.lease_id;

WITH remaining_dashboard_notes AS (
  SELECT
    id,
    NULLIF(TRIM(notes), '') AS lease_note,
    NULLIF(TRIM("dashboardNote"), '') AS dashboard_note
  FROM "Lease"
  WHERE NULLIF(TRIM("dashboardNote"), '') IS NOT NULL
)
UPDATE "Lease"
SET notes =
  CASE
    WHEN remaining_dashboard_notes.lease_note IS NULL THEN remaining_dashboard_notes.dashboard_note
    WHEN remaining_dashboard_notes.lease_note = remaining_dashboard_notes.dashboard_note THEN remaining_dashboard_notes.lease_note
    ELSE remaining_dashboard_notes.lease_note || E'\nDashboard note: ' || remaining_dashboard_notes.dashboard_note
  END
FROM remaining_dashboard_notes
WHERE "Lease".id = remaining_dashboard_notes.id;

ALTER TABLE "Property" DROP COLUMN "notes";
ALTER TABLE "Lease" DROP COLUMN "dashboardNote";
