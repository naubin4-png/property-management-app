import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isVerifiedGoogleUser,
  normalizeInvitationEmail,
} from "../lib/invitation-identity";

describe("workspace invitation identity checks", () => {
  it("normalizes verified identity email without changing mailbox semantics", () => {
    assert.equal(
      normalizeInvitationEmail("  Client.Name+leases@GMAIL.COM  "),
      "client.name+leases@gmail.com",
    );
  });

  it("accepts only an email-confirmed Google identity", () => {
    assert.equal(
      isVerifiedGoogleUser({
        email: "client@gmail.com",
        email_confirmed_at: "2026-07-28T12:00:00.000Z",
        app_metadata: { provider: "google", providers: ["google"] },
      }),
      true,
    );
    assert.equal(
      isVerifiedGoogleUser({
        email: "client@gmail.com",
        email_confirmed_at: "2026-07-28T12:00:00.000Z",
        app_metadata: { provider: "email", providers: ["email"] },
      }),
      false,
    );
    assert.equal(
      isVerifiedGoogleUser({
        email: "client@gmail.com",
        app_metadata: { provider: "google", providers: ["google"] },
      }),
      false,
    );
  });
});
