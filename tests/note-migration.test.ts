import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migrationSql = readFileSync(
  "prisma/migrations/20260728000000_optional_email_open_ended_leases/migration.sql",
  "utf8",
);

describe("note consolidation migration", () => {
  it("preserves conflicting legacy dashboard and property notes with labels", () => {
    assert.match(migrationSql, /Dashboard note:/);
    assert.match(migrationSql, /Property note:/);
    assert.match(migrationSql, /UPDATE "Lease"/);
  });
});
