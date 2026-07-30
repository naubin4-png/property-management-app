import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PeriodStatus, TriggerType } from "@prisma/client";

import {
  deriveCurrentRentSummary,
  deriveRentLedger,
  expectedPaymentAmount,
} from "../lib/rent-ledger";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("monthly rent history derivation", () => {
  it("defaults payment to a partial balance or one full month", () => {
    assert.equal(
      expectedPaymentAmount({
        creditBalanceCents: 190000,
        nextDueAmountCents: 400000,
        rentCents: 400000,
      }),
      210000,
    );
    assert.equal(
      expectedPaymentAmount({
        creditBalanceCents: 0,
        nextDueAmountCents: 400000,
        rentCents: 400000,
      }),
      400000,
    );
    assert.equal(
      expectedPaymentAmount({
        creditBalanceCents: 0,
        nextDueAmountCents: null,
        rentCents: 400000,
      }),
      400000,
    );
  });

  it("shows a partial payment on the affected month without a separate transaction row", () => {
    const ledger = deriveRentLedger({
      creditBalanceCents: 310000,
      today: date("2026-07-22"),
      periods: [
        {
          id: "jun",
          periodMonth: month("2026-06"),
          amountDueCents: 520000,
          status: PeriodStatus.RECEIVED,
          paymentId: "jun-payment",
        },
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 520000,
          status: PeriodStatus.LATE,
          paymentId: null,
        },
      ],
      payments: [
        {
          id: "partial",
          receivedAt: date("2026-07-10"),
          amountCents: 310000,
          paymentMethod: "ACH",
          notes: "Partial July payment",
        },
      ],
    });

    const july = ledger.find((row) => row.id === "month:jul");
    assert.equal(ledger.length, 2);
    assert.equal(july?.kind, "month");
    assert.equal(july?.status, "Partially paid");
    assert.equal(july?.context, "Partially paid Jul 10 · $2,100 remaining");
    assert.deepEqual(july?.payments.map((payment) => payment.id), ["partial"]);
  });

  it("represents one advance payment on every month it covers", () => {
    const ledger = deriveRentLedger({
      creditBalanceCents: 0,
      today: date("2026-07-22"),
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 325000,
          status: PeriodStatus.RECEIVED,
          paymentId: "bulk",
        },
        {
          id: "aug",
          periodMonth: month("2026-08"),
          amountDueCents: 325000,
          status: PeriodStatus.RECEIVED,
          paymentId: "bulk",
        },
      ],
      payments: [
        {
          id: "bulk",
          receivedAt: date("2026-07-04"),
          amountCents: 650000,
          paymentMethod: "ACH",
          notes: "Two months paid at once",
        },
      ],
    });

    assert.deepEqual(
      ledger.map((row) => ({
        activity: row.activity,
        context: row.context,
        payments: row.payments.map((payment) => payment.id),
        status: row.status,
      })),
      [
        {
          activity: "August 2026",
          context: "Paid Jul 4 · $3,250",
          payments: ["bulk"],
          status: "Paid",
        },
        {
          activity: "July 2026",
          context: "Paid Jul 4 · $3,250",
          payments: ["bulk"],
          status: "Paid",
        },
      ],
    );
  });

  it("keeps a shared payment attached when it fully pays one month and partially pays the next", () => {
    const ledger = deriveRentLedger({
      creditBalanceCents: 150000,
      today: date("2026-07-22"),
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 400000,
          status: PeriodStatus.RECEIVED,
          paymentId: "shared",
        },
        {
          id: "aug",
          periodMonth: month("2026-08"),
          amountDueCents: 400000,
          status: PeriodStatus.PENDING,
          paymentId: null,
        },
      ],
      payments: [
        {
          id: "shared",
          receivedAt: date("2026-07-15"),
          amountCents: 550000,
          paymentMethod: "WIRE",
          notes: null,
        },
      ],
    });

    const august = ledger.find((row) => row.id === "month:aug");
    assert.equal(august?.context, "Partially paid Jul 15 · $2,500 remaining");
    assert.deepEqual(
      august?.payments.map((payment) => payment.id),
      ["shared"],
    );
  });

  it("shows only successful reminder or late-notice activity in current rent", () => {
    const current = deriveCurrentRentSummary({
      creditBalanceCents: 0,
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 400000,
          status: PeriodStatus.LATE,
          paymentId: null,
        },
      ],
      emailLogs: [
        {
          triggerType: TriggerType.RENT_REMINDER,
          sentAt: date("2026-07-03"),
          error: "Mailbox unavailable",
        },
        {
          triggerType: TriggerType.LATE_NOTICE,
          sentAt: date("2026-07-05"),
          error: null,
        },
      ],
    });

    assert.equal(current?.badge, "UNPAID");
    assert.equal(current?.amountRemainingCents, 400000);
    assert.deepEqual(current?.successfulEmailActivity, {
      label: "Late notice sent",
      sentAt: date("2026-07-05"),
    });
  });

  it("has no current rent summary for a future tracking-start lease", () => {
    const current = deriveCurrentRentSummary({
      creditBalanceCents: 0,
      periods: [
        {
          id: "sep",
          periodMonth: month("2026-09"),
          amountDueCents: 140000,
          status: PeriodStatus.PENDING,
          paymentId: null,
        },
      ],
      emailLogs: [],
    });

    assert.equal(current, null);
  });

  it("shows reverted periods as unpaid after a payment deletion removes allocation", () => {
    const ledger = deriveRentLedger({
      creditBalanceCents: 0,
      today: date("2026-07-28"),
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 90000,
          status: PeriodStatus.PENDING,
          paymentId: null,
        },
        {
          id: "aug",
          periodMonth: month("2026-08"),
          amountDueCents: 90000,
          status: PeriodStatus.PENDING,
          paymentId: null,
        },
      ],
      payments: [],
    });

    assert.deepEqual(
      ledger.map((row) => ({
          activity: row.activity,
          context: row.context,
          status: row.status,
        })),
      [
        {
          activity: "July 2026",
          context: "Unpaid · $900 remaining",
          status: "Unpaid",
        },
      ],
    );
  });
});
