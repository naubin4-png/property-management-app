import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  forecastPaymentAllocation,
  formatPaymentForecastRemainder,
} from "../lib/payment-forecast";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function forecast({
  amountCents,
  otherCreditCents = 0,
}: {
  amountCents: number;
  otherCreditCents?: number;
}) {
  return forecastPaymentAllocation({
    amountCents,
    currentMonth: month("2026-08"),
    editedPaymentId: "edited",
    firstPeriodMonth: month("2026-06"),
    lastPeriodMonth: null,
    rentCents: 400000,
    payments: [
      { id: "older", amountCents: 300000 },
      { id: "edited", amountCents: 650000 },
      ...(otherCreditCents
        ? [{ id: "partial", amountCents: otherCreditCents }]
        : []),
    ],
    periods: [
      {
        id: "jun",
        periodMonth: month("2026-06"),
        amountDueCents: 300000,
        status: "RECEIVED",
        paymentId: "older",
      },
      {
        id: "jul",
        periodMonth: month("2026-07"),
        amountDueCents: 300000,
        status: "RECEIVED",
        paymentId: "edited",
      },
      {
        id: "aug",
        periodMonth: month("2026-08"),
        amountDueCents: 400000,
        status: "PENDING",
        paymentId: null,
      },
    ],
  });
}

describe("payment edit forecast", () => {
  it("reverses the edited payment before forecasting its replacement", () => {
    const result = forecast({ amountCents: 700000 });

    assert.deepEqual(
      result.applications.map((application) => [
        application.periodMonth.toISOString().slice(0, 7),
        application.amountDueCents,
      ]),
      [
        ["2026-07", 300000],
        ["2026-08", 400000],
      ],
    );
    assert.equal(result.nextDueDate?.toISOString().slice(0, 7), "2026-09");
    assert.equal(result.creditCents, 0);
  });

  it("uses immutable historical period rent and leaves a partial remainder", () => {
    const result = forecast({ amountCents: 350000 });

    assert.deepEqual(
      result.applications.map((application) =>
        application.periodMonth.toISOString().slice(0, 7),
      ),
      ["2026-07"],
    );
    assert.equal(result.creditCents, 50000);
    assert.equal(result.nextDueDate?.toISOString().slice(0, 7), "2026-08");
    assert.equal(result.nextDueAmountCents, 400000);
    assert.equal(result.nextDueRemainingCents, 350000);
  });

  it("reports the rent still due when an edited payment remains partial", () => {
    const result = forecastPaymentAllocation({
      amountCents: 100000,
      currentMonth: month("2026-07"),
      editedPaymentId: "edited",
      firstPeriodMonth: month("2026-07"),
      lastPeriodMonth: null,
      rentCents: 185000,
      payments: [{ id: "edited", amountCents: 100000 }],
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 185000,
          status: "PENDING",
          paymentId: null,
        },
      ],
    });

    assert.equal(result.creditCents, 100000);
    assert.equal(result.nextDueDate?.toISOString().slice(0, 7), "2026-07");
    assert.equal(result.nextDueRemainingCents, 85000);
    assert.equal(
      formatPaymentForecastRemainder({
        creditCents: result.creditCents,
        nextDueDate: result.nextDueDate,
        nextDueRemainingCents: result.nextDueRemainingCents,
      }),
      " $850.00 still due for Jul 2026.",
    );
  });

  it("preserves the credit label for a true surplus", () => {
    assert.equal(
      formatPaymentForecastRemainder({
        creditCents: 50000,
        nextDueDate: null,
        nextDueRemainingCents: null,
      }),
      " Credit: $500.00.",
    );
  });

  it("combines shared credit and an edited payment without double-counting either", () => {
    const result = forecast({
      amountCents: 300000,
      otherCreditCents: 100000,
    });

    assert.deepEqual(
      result.applications.map((application) =>
        application.periodMonth.toISOString().slice(0, 7),
      ),
      ["2026-07"],
    );
    assert.equal(result.creditCents, 100000);
    assert.equal(result.nextDueDate?.toISOString().slice(0, 7), "2026-08");
  });

  it("creates the same future applications an advance save will create", () => {
    const result = forecast({ amountCents: 1500000 });

    assert.deepEqual(
      result.applications.map((application) =>
        application.periodMonth.toISOString().slice(0, 7),
      ),
      ["2026-07", "2026-08", "2026-09", "2026-10"],
    );
    assert.equal(result.nextDueDate?.toISOString().slice(0, 7), "2026-11");
    assert.equal(result.creditCents, 0);
  });

  it("does not mutate the saved ledger while calculating a preview", () => {
    const periods = [
      {
        id: "jul",
        periodMonth: month("2026-07"),
        amountDueCents: 400000,
        status: "RECEIVED" as const,
        paymentId: "edited",
      },
    ];

    forecastPaymentAllocation({
      amountCents: 200000,
      currentMonth: month("2026-07"),
      editedPaymentId: "edited",
      firstPeriodMonth: month("2026-07"),
      lastPeriodMonth: null,
      payments: [{ id: "edited", amountCents: 400000 }],
      periods,
      rentCents: 400000,
    });

    assert.equal(periods[0].status, "RECEIVED");
    assert.equal(periods[0].paymentId, "edited");
  });
});
