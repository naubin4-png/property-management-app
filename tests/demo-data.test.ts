import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDemoCreatedLeaseRedirectParams,
  encodeDemoCreatedLease,
  getDemoDashboardData,
  getDemoCreatedLease,
  getDemoEmailCoverage,
  getDemoEmailData,
  getDemoNoteSimulation,
  getDemoPropertyDetails,
  parseDemoSessionState,
  type DemoSessionState,
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

  it("keeps the panel current-rent summary on the same billing month as the dashboard", () => {
    // Regression: the demo panel resolved "current rent" from the real system
    // clock while the dashboard and seed used the frozen demo billing month.
    // Once real time passed the snapshot month, the same lease showed one month
    // on the dashboard card and a different month in its panel header (e.g.
    // Lakeview Retail: $2,100 remaining for July on the card, $5,200 for August
    // in the panel). Both surfaces must agree on the frozen demo billing month.
    const dashboard = getDemoDashboardData();
    const billingMonth = dashboard.summary.billingPeriodMonth.getTime();

    for (const property of dashboard.properties) {
      if (!property.hasActiveLease) {
        continue;
      }
      const detail = getDemoPropertyDetails(property.id);
      const summary = detail?.activeLease?.currentRent;
      assert.ok(summary, `${property.name} should have a current-rent summary`);
      assert.equal(
        summary.billingMonth.getTime(),
        billingMonth,
        `${property.name} panel billing month must match the dashboard`,
      );
      assert.equal(
        summary.amountRemainingCents,
        property.billingPeriodRemainingCents,
        `${property.name} panel remaining must match the dashboard card`,
      );
      assert.equal(
        summary.badge,
        property.billingPeriodRemainingCents === 0 ? "PAID" : "UNPAID",
        `${property.name} panel badge must match the dashboard card`,
      );
    }

    // Pin the specific number from the reported contradiction.
    const lakeview = card("Lakeview Retail", dashboard.properties);
    const lakeviewDetail = getDemoPropertyDetails(lakeview.id);
    assert.equal(
      lakeviewDetail?.activeLease?.currentRent?.amountRemainingCents,
      210000,
    );
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

  it("keeps the current-month demo payment prompt unobscured after lease creation", () => {
    const params = buildDemoCreatedLeaseRedirectParams({
      currentMonth: new Date("2026-07-01T00:00:00.000Z"),
      firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
      propertyId: "demo-created-unit",
    });

    assert.equal(params.get("leaseAdded"), "1");
    assert.equal(params.get("propertyId"), "demo-created-unit");
    assert.equal(params.get("property"), null);
    assert.equal(params.get("demoLease"), null);
  });

  it("keeps a created lease in browser session state instead of the URL", () => {
    const encoded = encodeDemoCreatedLease({
      id: "demo-created-safe-id",
      propertyName: "Private Unit Name",
      tenantName: "Private Tenant Name",
      tenantEmail: "private@example.com",
      firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
      lastPeriodMonth: null,
      rentCents: 120000,
    });

    const session = parseDemoSessionState(
      JSON.stringify({ createdLease: encoded }),
    );
    const lease = getDemoCreatedLease({ demoLease: session.createdLease ?? "" });

    assert.equal(lease?.id, "demo-created-safe-id");
    assert.equal(lease?.name, "Private Unit Name");
    assert.equal(lease?.tenantEmail, "private@example.com");
  });

  it("keeps multiple payment-first leases in the same demo session", () => {
    const encodedLeases = ["First Demo Unit", "Second Demo Unit"].map(
      (propertyName, index) =>
        encodeDemoCreatedLease({
          id: `demo-created-${index + 1}`,
          propertyName,
          tenantName: `Tenant ${index + 1}`,
          tenantEmail: null,
          firstPeriodMonth: new Date("2026-07-01T00:00:00.000Z"),
          lastPeriodMonth: null,
          rentCents: 100000,
        }),
    );
    const session = parseDemoSessionState(
      JSON.stringify({ createdLeases: encodedLeases }),
    );
    const leases = session.createdLeases
      .map((demoLease) => getDemoCreatedLease({ demoLease }))
      .filter((lease) => lease !== null);
    const dashboard = getDemoDashboardData(null, leases, null, session);

    assert.ok(card("First Demo Unit", dashboard.properties));
    assert.ok(card("Second Demo Unit", dashboard.properties));
  });

  it("preserves backdated arrears and payment allocation in demo session state", () => {
    const createdLease = getDemoCreatedLease({
      demoLease: encodeDemoCreatedLease({
        id: "demo-created-arrears",
        propertyName: "Arrears Unit",
        tenantName: "Arrears Tenant",
        tenantEmail: null,
        firstPeriodMonth: new Date("2026-05-01T00:00:00.000Z"),
        lastPeriodMonth: null,
        rentCents: 100000,
      }),
    });
    assert.ok(createdLease);
    const session = parseDemoSessionState(
      JSON.stringify({
        createdLease: encodeDemoCreatedLease({
          id: "demo-created-arrears",
          propertyName: "Arrears Unit",
          tenantName: "Arrears Tenant",
          tenantEmail: null,
          firstPeriodMonth: new Date("2026-05-01T00:00:00.000Z"),
          lastPeriodMonth: null,
          rentCents: 100000,
        }),
        payments: [
          {
            id: "request-arrears",
            amountCents: 250000,
            notes: null,
            paymentMethod: "ACH",
            propertyId: "demo-created-arrears",
            receivedAt: "2026-07-20",
          },
        ],
      }),
    );

    const detail = getDemoPropertyDetails(
      createdLease.id,
      null,
      createdLease,
      null,
      session,
    );

    assert.deepEqual(
      detail?.activeLease?.periods.map((period) => [
        period.periodMonth.toISOString().slice(0, 7),
        period.status,
      ]),
      [
        ["2026-05", "RECEIVED"],
        ["2026-06", "RECEIVED"],
        ["2026-07", "LATE"],
      ],
    );
    assert.equal(detail?.activeLease?.creditBalanceCents, 50000);
  });

  it("opens future-start demo leases because they do not need a current-month payment prompt", () => {
    const params = buildDemoCreatedLeaseRedirectParams({
      currentMonth: new Date("2026-07-01T00:00:00.000Z"),
      firstPeriodMonth: new Date("2026-09-01T00:00:00.000Z"),
      propertyId: "demo-created-unit",
    });

    assert.equal(params.get("leaseAdded"), null);
    assert.equal(params.get("propertyId"), null);
    assert.equal(params.get("property"), "demo-created-unit");
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

  it("derives demo email coverage from active leases and optional tenant email", () => {
    const coverage = getDemoEmailCoverage();

    assert.equal(coverage.activeCount, 5);
    assert.equal(coverage.canReceiveCount, 4);
    assert.deepEqual(coverage.missingEmail, [
      {
        propertyId: "cedar-studio",
        propertyName: "Cedar Street Studio",
        tenantName: "Jordan Lee",
      },
    ]);
  });

  it("uses session-scoped demo tenant email settings with realistic delivery statuses", () => {
    const data = getDemoEmailData({
      sendBeforeDue: false,
      sendAfterDue: true,
      daysBeforeReminder: 8,
      gracePeriodDays: 4,
      reminderEmailSubject: "Custom reminder",
      reminderEmailBody: "Reminder body",
      lateNoticeSubject: "Custom late notice",
      lateNoticeBody: "Late body",
    });

    assert.equal(data.settings.daysBeforeReminder, 8);
    assert.equal(data.settings.gracePeriodDays, 4);
    assert.deepEqual(
      data.emailLogs.map((log) => ({
        propertyId: log.propertyId,
        triggerType: log.triggerType,
        error: log.error,
      })),
      [
        {
          propertyId: "harbor-office",
          triggerType: "LATE_NOTICE",
          error: null,
        },
        {
          propertyId: "riverside-warehouse",
          triggerType: "RENT_REMINDER",
          error: null,
        },
        {
          propertyId: "lakeview-retail",
          triggerType: "LATE_NOTICE",
          error: "Mailbox unavailable",
        },
      ],
    );
  });

  it("simulates retrying a failed demo delivery for the browser session", () => {
    const data = getDemoEmailData(undefined, ["demo-email-lakeview-failed"]);
    const lakeviewLog = data.emailLogs.find(
      (log) => log.id === "demo-email-lakeview-failed",
    );

    assert.equal(lakeviewLog?.error, null);
  });

  it("applies session-scoped demo detail edits and payment deletion to the shared detail model", () => {
    const session: DemoSessionState = {
      createdLease: null,
      createdLeases: [],
      deletedPaymentIds: ["lakeview-retail-july-partial"],
      payments: [],
      detailEdits: {
        "lakeview-retail": {
          lastPeriodMonth: null,
          note: "Updated demo note",
          propertyName: "Lakeview Retail Updated",
          rentCents: 530000,
          tenantEmail: null,
          tenantName: "Samira Updated",
        },
      },
    };
    const dashboard = getDemoDashboardData(null, null, null, session);
    const detail = getDemoPropertyDetails(
      "lakeview-retail",
      null,
      null,
      null,
      session,
    );

    assert.equal(detail?.name, "Lakeview Retail Updated");
    assert.equal(detail?.activeLease?.tenant.name, "Samira Updated");
    assert.equal(detail?.activeLease?.tenant.email, null);
    assert.equal(detail?.activeLease?.lastPeriodMonth, null);
    assert.equal(detail?.activeLease?.notes, "Updated demo note");
    assert.equal(
      detail?.payments.some(
        (payment) => payment.id === "lakeview-retail-july-partial",
      ),
      false,
    );
    assert.equal(
      dashboard.properties.find((property) => property.id === "lakeview-retail")
        ?.note,
      "Updated demo note",
    );
  });

  it("makes the saved demo edit match its reversed-payment forecast", () => {
    const session: DemoSessionState = {
      createdLease: null,
      createdLeases: [],
      deletedPaymentIds: [],
      detailEdits: {},
      payments: [
        {
          amountCents: 325000,
          id: "market-street-payment",
          notes: "Edited to one month",
          paymentMethod: "ACH",
          propertyId: "market-street",
          receivedAt: "2026-07-04",
        },
      ],
    };
    const dashboard = getDemoDashboardData(null, null, null, session);
    const detail = getDemoPropertyDetails(
      "market-street",
      null,
      null,
      null,
      session,
    );

    assert.equal(
      detail?.activeLease?.periods.find(
        (period) => period.periodMonth.toISOString().slice(0, 7) === "2026-07",
      )?.status,
      "RECEIVED",
    );
    assert.equal(
      detail?.activeLease?.periods.find(
        (period) => period.periodMonth.toISOString().slice(0, 7) === "2026-08",
      )?.status,
      "UPCOMING",
    );
    assert.equal(
      dashboard.properties
        .find((property) => property.id === "market-street")
        ?.nextDueDate?.toISOString()
        .slice(0, 7),
      "2026-08",
    );
  });
});
