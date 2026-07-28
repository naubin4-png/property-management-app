ALTER TABLE "Tenant" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Lease" ALTER COLUMN "lastPeriodMonth" DROP NOT NULL;

WITH normalized_lease_notes AS (
  SELECT
    id,
    NULLIF(TRIM(notes), '') AS lease_note,
    NULLIF(TRIM("dashboardNote"), '') AS dashboard_note
  FROM "Lease"
),
merged_lease_notes AS (
  SELECT
    id,
    CASE
      WHEN lease_note IS NULL THEN dashboard_note
      WHEN dashboard_note IS NULL OR dashboard_note = lease_note THEN lease_note
      ELSE lease_note || E'\nDashboard note: ' || dashboard_note
    END AS merged_note
  FROM normalized_lease_notes
)
UPDATE "Lease"
SET notes = merged_lease_notes.merged_note
FROM merged_lease_notes
WHERE "Lease".id = merged_lease_notes.id
  AND merged_lease_notes.merged_note IS NOT NULL;

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
active_property_notes AS (
  SELECT
    ranked_leases.id AS lease_id,
    NULLIF(TRIM(p.notes), '') AS property_note,
    NULLIF(TRIM(l.notes), '') AS lease_note
  FROM ranked_leases
  JOIN "Property" p ON p.id = ranked_leases."propertyId"
  JOIN "Lease" l ON l.id = ranked_leases.id
  WHERE ranked_leases.rank = 1
)
UPDATE "Lease"
SET notes =
  CASE
    WHEN active_property_notes.lease_note IS NULL THEN active_property_notes.property_note
    WHEN active_property_notes.property_note IS NULL OR active_property_notes.property_note = active_property_notes.lease_note THEN active_property_notes.lease_note
    ELSE active_property_notes.lease_note || E'\nProperty note: ' || active_property_notes.property_note
  END
FROM active_property_notes
WHERE "Lease".id = active_property_notes.lease_id
  AND active_property_notes.property_note IS NOT NULL;
