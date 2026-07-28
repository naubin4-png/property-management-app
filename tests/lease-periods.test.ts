import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enumerateLeaseMonths,
  leaseCoversMonth,
} from "../lib/lease-periods";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

describe("lease period helpers", () => {
  it("enumerates fixed-term leases through the persisted end month", () => {
    assert.deepEqual(
      enumerateLeaseMonths({
        firstPeriodMonth: month("2026-07"),
        lastPeriodMonth: month("2026-09"),
        minimumThrough: month("2026-07"),
      }).map((date) => date.toISOString().slice(0, 7)),
      ["2026-07", "2026-08", "2026-09"],
    );
  });

  it("bounds open-ended generation to the needed month", () => {
    assert.deepEqual(
      enumerateLeaseMonths({
        firstPeriodMonth: month("2026-07"),
        lastPeriodMonth: null,
        minimumThrough: month("2026-09"),
      }).map((date) => date.toISOString().slice(0, 7)),
      ["2026-07", "2026-08", "2026-09"],
    );
  });

  it("classifies active months for fixed-term, open-ended, and future leases", () => {
    assert.equal(
      leaseCoversMonth({
        firstPeriodMonth: month("2026-06"),
        lastPeriodMonth: month("2026-08"),
        month: month("2026-07"),
      }),
      true,
    );
    assert.equal(
      leaseCoversMonth({
        firstPeriodMonth: month("2026-06"),
        lastPeriodMonth: null,
        month: month("2026-11"),
      }),
      true,
    );
    assert.equal(
      leaseCoversMonth({
        firstPeriodMonth: month("2026-09"),
        lastPeriodMonth: null,
        month: month("2026-07"),
      }),
      false,
    );
  });
});
