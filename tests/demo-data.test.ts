import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDemoDashboardData,
  type DemoPaymentSimulation,
} from "../lib/demo-data";

function card(name: string, cards = getDemoDashboardData().properties) {
  const property = cards.find((item) => item.name === name);
  assert.ok(property, `${name} should exist`);

  return property;
}

describe("demo dashboard state", () => {
  it("derives unpaid and paid sections from the billing period", () => {
    const dashboard = getDemoDashboardData();

    assert.deepEqual(
      dashboard.needsAttention.map((property) => property.name),
      ["Harbor Office Suite 4", "Riverside Warehouse", "Lakeview Retail"],
    );
    assert.deepEqual(
      dashboard.allGood.map((property) => property.name),
      ["88 Market Street", "Cedar Street Studio"],
    );
    assert.equal(
      card("Riverside Warehouse").billingPeriodRemainingCents,
      680000,
    );
    assert.equal(card("Lakeview Retail").billingPeriodRemainingCents, 210000);
    assert.equal(
      dashboard.summary.billingPeriodMonth.toISOString(),
      "2026-07-01T00:00:00.000Z",
    );
    assert.equal(dashboard.summary.collectedThisMonthCents, 910000);
    assert.equal(dashboard.summary.outstandingCents, 1290000);
  });

  it("explains advance-paid leases from covered payment periods", () => {
    const market = card("88 Market Street");

    assert.equal(market.status, "PAID");
    assert.equal(market.advancePayment?.monthsPaid, 2);
    assert.equal(
      market.advancePayment?.paidAt.toISOString(),
      "2026-07-04T00:00:00.000Z",
    );
    assert.equal(
      market.advancePayment?.paidThrough.toISOString(),
      "2026-08-01T00:00:00.000Z",
    );
    assert.equal(
      market.nextDueDate?.toISOString(),
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("simulates recording a payment by moving late rent to current", () => {
    const simulation: DemoPaymentSimulation = {
      propertyId: "harbor-office",
      amountCents: 400000,
      receivedAt: new Date("2026-07-22T00:00:00.000Z"),
    };
    const dashboard = getDemoDashboardData(simulation);
    const harbor = card("Harbor Office Suite 4", dashboard.properties);

    assert.equal(harbor.status, "PAID");
    assert.equal(harbor.amountOwedCents, 0);
    assert.equal(
      harbor.nextDueDate?.toISOString(),
      "2026-08-01T00:00:00.000Z",
    );
    assert.equal(
      harbor.billingPeriodPaidAt?.toISOString(),
      "2026-07-22T00:00:00.000Z",
    );
    assert.deepEqual(
      dashboard.needsAttention.map((property) => property.name),
      ["Riverside Warehouse", "Lakeview Retail"],
    );
    assert.equal(dashboard.summary.collectedThisMonthCents, 1310000);
    assert.equal(dashboard.summary.outstandingCents, 890000);
  });
});
