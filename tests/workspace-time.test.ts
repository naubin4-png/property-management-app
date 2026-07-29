import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstDayOfWorkspaceMonth,
  isValidTimeZone,
  workspaceCalendarDate,
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
});
