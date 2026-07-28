import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  encodeDemoCreatedLease,
  getDemoDashboardData,
  getDemoCreatedLease,
  getDemoNoteSimulation,
  getDemoPropertyDetails,
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

  it("does not duplicate a simulated payment between dashboard and detail reads", () => {
    const createdLease = getDemoCreatedLease({
      demoLease: encodeDemoCreatedLease({
        propertyName: "Single Payment Unit",
        tenantName: "Morgan Tenant",
        tenantEmail: null,
        firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
        lastPeriodMonth: null,
        rentCents: 180000,
      }),
    });
    assert.ok(createdLease);

    const simulation: DemoPaymentSimulation = {
      propertyId: createdLease.id,
      amountCents: 180000,
      receivedAt: new Date("2026-07-28T00:00:00.000Z"),
    };

    getDemoDashboardData(simulation, createdLease);
    const detail = getDemoPropertyDetails(
      createdLease.id,
      simulation,
      createdLease,
    );

    assert.equal(detail?.payments.length, 1);
    assert.equal(detail?.payments[0].amountCents, 180000);
  });

  it("shows a current-month demo lease with optional email as unpaid", () => {
    const createdLease = getDemoCreatedLease({
      demoLease: encodeDemoCreatedLease({
        propertyName: "New Demo Unit",
        tenantName: "Taylor Smith",
        tenantEmail: null,
        firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
        lastPeriodMonth: null,
        rentCents: 120000,
      }),
    });
    assert.ok(createdLease);

    const dashboard = getDemoDashboardData(null, createdLease);
    const property = card("New Demo Unit", dashboard.properties);
    const detail = getDemoPropertyDetails(property.id, null, createdLease);

    assert.equal(property.status, "LATE");
    assert.equal(property.billingPeriodRemainingCents, 120000);
    assert.equal(detail?.activeLease?.tenant.email, null);
    assert.equal(detail?.activeLease?.lastPeriodMonth, null);
  });

  it("keeps future-start demo leases visible without adding current-month due", () => {
    const createdLease = getDemoCreatedLease({
      demoLease: encodeDemoCreatedLease({
        propertyName: "Future Demo Unit",
        tenantName: "Casey Lee",
        tenantEmail: "casey@example.com",
        firstPeriodMonth: new Date("2026-09-01T00:00:00.000Z"),
        lastPeriodMonth: null,
        rentCents: 190000,
      }),
    });
    assert.ok(createdLease);

    const dashboard = getDemoDashboardData(null, createdLease);
    const property = card("Future Demo Unit", dashboard.properties);

    assert.equal(property.hasActiveLease, false);
    assert.equal(property.billingPeriodRemainingCents, 0);
    assert.equal(
      property.nextDueDate?.toISOString(),
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("simulates lease detail note edits on dashboard cards", () => {
    const noteSimulation = getDemoNoteSimulation({
      note: "Call tenant before Friday",
      noteProperty: "cedar-studio",
    });
    const dashboard = getDemoDashboardData(null, null, noteSimulation);
    const cedar = card("Cedar Street Studio", dashboard.properties);
    const detail = getDemoPropertyDetails("cedar-studio", null, null, noteSimulation);

    assert.equal(cedar.note, "Call tenant before Friday");
    assert.equal(detail?.notes, null);
    assert.equal(detail?.activeLease?.notes, "Call tenant before Friday");
  });

  it("keeps newly created demo leases note-free until edited", () => {
    const createdLease = getDemoCreatedLease({
      demoLease: encodeDemoCreatedLease({
        propertyName: "No Note Unit",
        tenantName: "Riley Tenant",
        tenantEmail: null,
        firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
        lastPeriodMonth: null,
        rentCents: 140000,
      }),
    });
    assert.ok(createdLease);

    const dashboard = getDemoDashboardData(null, createdLease);
    const property = card("No Note Unit", dashboard.properties);

    assert.equal(property.note, "");
  });
});
