import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activeMembershipWhere,
  membershipAccessLabel,
} from "../lib/membership-access";

// Regression: ISSUE-001 — accepted client access could not be revoked
// Found by /qa on 2026-07-29
// Report: ~/.gstack/projects/property-manager/real-client-acceptance-2026-07-29/qa-reports
describe("revocable workspace membership access", () => {
  it("only resolves memberships that have not been revoked", () => {
    assert.deepEqual(activeMembershipWhere("client-user-id"), {
      userId: "client-user-id",
      revokedAt: null,
    });
  });

  it("labels active and revoked access clearly for the administrator", () => {
    assert.equal(membershipAccessLabel(null), "Access active");
    assert.equal(
      membershipAccessLabel(new Date("2026-07-29T00:00:00.000Z")),
      "Access revoked",
    );
  });
});
