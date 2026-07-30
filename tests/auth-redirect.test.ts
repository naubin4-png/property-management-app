import assert from "node:assert/strict";
import test from "node:test";

import { safeAppDestination } from "../lib/auth-redirect";

test("preserves approved application destinations and query strings", () => {
  assert.equal(safeAppDestination("/"), "/");
  assert.equal(safeAppDestination("/email"), "/email");
  assert.equal(safeAppDestination("/admin"), "/admin");
  assert.equal(safeAppDestination("/properties/new"), "/properties/new");
  assert.equal(
    safeAppDestination("/properties/8d457016-acde-4eef-b955-7c563087dbcc?tab=ledger"),
    "/properties/8d457016-acde-4eef-b955-7c563087dbcc?tab=ledger",
  );
  assert.equal(
    safeAppDestination(
      "/properties/8d457016-acde-4eef-b955-7c563087dbcc/leases/11eeaed0-acde-4eef-b955-7c563087dbcc/edit",
    ),
    "/properties/8d457016-acde-4eef-b955-7c563087dbcc/leases/11eeaed0-acde-4eef-b955-7c563087dbcc/edit",
  );
});

test("falls back to the dashboard for external or unknown destinations", () => {
  assert.equal(safeAppDestination("https://example.com"), "/");
  assert.equal(safeAppDestination("//example.com"), "/");
  assert.equal(safeAppDestination("/demo"), "/");
  assert.equal(safeAppDestination("/properties/not-a-uuid"), "/");
});
