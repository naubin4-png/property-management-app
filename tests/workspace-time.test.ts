import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveWorkspaceBillingClock,
  firstDayOfWorkspaceMonth,
  isValidTimeZone,
  workspaceCalendarDate,
  workspaceDateInputValue,
} from "../lib/workspace-time";

describe("workspace calendar boundaries", () => {
  it("uses the workspace date when UTC is already in the next month", () => {
    const instant = new Date("2026-08-01T03:30:00.000Z");
    assert.equal(
      firstDayOfWorkspaceMonth(instant, "America/New_York").toISOString(),
      "2026-07-01T00:00:00.000Z",
    );
    assert.equal(
      firstDayOfWorkspaceMonth(instant, "UTC").toISOString(),
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("keeps local dates stable across daylight-saving transitions", () => {
    assert.equal(
      workspaceCalendarDate(
        new Date("2026-03-08T06:59:00.000Z"),
        "America/New_York",
      ).toISOString(),
      "2026-03-08T00:00:00.000Z",
    );
    assert.equal(
      workspaceCalendarDate(
        new Date("2026-03-08T07:01:00.000Z"),
        "America/New_York",
      ).toISOString(),
      "2026-03-08T00:00:00.000Z",
    );
  });

  it("validates IANA timezones", () => {
    assert.equal(isValidTimeZone("America/New_York"), true);
    assert.equal(isValidTimeZone("Not/A_Timezone"), false);
  });

  it("formats the default received date in the workspace timezone", () => {
    const instant = new Date("2026-08-01T03:30:00.000Z");
    assert.equal(
      workspaceDateInputValue(instant, "America/New_York"),
      "2026-07-31",
    );
    assert.equal(workspaceDateInputValue(instant, "UTC"), "2026-08-01");
  });

  it("derives one coherent billing month per instant across a workspace month boundary", () => {
    // Regression: a single property/dashboard request used to read the clock
    // several times (panel summary, ledger "today", payment availability,
    // payment-date default). Straddling a workspace-local month boundary between
    // reads combined two billing months in one request. The request now derives
    // everything from one captured instant; prove that instant is internally
    // consistent on both sides of the boundary. Deterministic — no real clock.
    const tz = "America/New_York";

    // 2026-07-31 23:59:59 EDT (UTC-4) is still July in the workspace.
    const before = deriveWorkspaceBillingClock(
      new Date("2026-08-01T03:59:59.000Z"),
      tz,
    );
    assert.equal(before.currentMonth.toISOString(), "2026-07-01T00:00:00.000Z");
    assert.equal(before.nextMonth.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(before.today.toISOString(), "2026-07-31T00:00:00.000Z");
    assert.equal(before.receivedAtDefault, "2026-07-31");
    // Cross-field coherence: every value describes the same month.
    assert.equal(
      before.today.toISOString().slice(0, 7),
      before.currentMonth.toISOString().slice(0, 7),
    );
    assert.equal(
      before.receivedAtDefault.slice(0, 7),
      before.currentMonth.toISOString().slice(0, 7),
    );

    // 2026-08-01 00:00:01 EDT is August in the workspace — one instant, two
    // seconds later, everything moves together to August.
    const after = deriveWorkspaceBillingClock(
      new Date("2026-08-01T04:00:01.000Z"),
      tz,
    );
    assert.equal(after.currentMonth.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(after.nextMonth.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(after.today.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(after.receivedAtDefault, "2026-08-01");
    assert.equal(
      after.today.toISOString().slice(0, 7),
      after.currentMonth.toISOString().slice(0, 7),
    );
    assert.equal(
      after.receivedAtDefault.slice(0, 7),
      after.currentMonth.toISOString().slice(0, 7),
    );
  });
});
