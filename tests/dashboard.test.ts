import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectedForBillingPeriod } from "../lib/dashboard";

describe("dashboard billing-period totals", () => {
  it("uses the period snapshot instead of a later lease rent change", () => {
    assert.equal(
      collectedForBillingPeriod([
        {
          billingPeriodAmountDueCents: 100_000,
          billingPeriodRemainingCents: 100_000,
        },
      ]),
      0,
    );
  });

  it("adds only money actually applied to the displayed period", () => {
    assert.equal(
      collectedForBillingPeriod([
        {
          billingPeriodAmountDueCents: 100_000,
          billingPeriodRemainingCents: 25_000,
        },
        {
          billingPeriodAmountDueCents: 200_000,
          billingPeriodRemainingCents: 0,
        },
      ]),
      275_000,
    );
  });
});
