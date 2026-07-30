import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectedForBillingPeriod,
  collectionProgress,
} from "../lib/dashboard";

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

describe("dashboard collection progress", () => {
  it("summarizes collected and outstanding rent without overstating progress", () => {
    assert.deepEqual(
      collectionProgress({
        collectedCents: 910_000,
        outstandingCents: 1_290_000,
      }),
      { totalCents: 2_200_000, percent: 41 },
    );
  });

  it("keeps an empty workspace at zero progress", () => {
    assert.deepEqual(
      collectionProgress({ collectedCents: 0, outstandingCents: 0 }),
      { totalCents: 0, percent: 0 },
    );
  });
});
