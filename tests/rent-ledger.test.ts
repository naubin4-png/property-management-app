import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PeriodStatus, TriggerType } from "@prisma/client";

import {
  deriveCurrentRentSummary,
  deriveRentLedger,
} from "../lib/rent-ledger";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("rent activity ledger derivation", () => {
  it("keeps partial payments as payment rows without falsely assigning them to a month", () => {
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

    const payment = ledger.find((row) => row.id === "payment:partial");
    const julyCharge = ledger.find((row) => row.id === "charge:jul");

    assert.equal(payment?.kind, "payment");
    assert.equal(payment?.context, "Unallocated credit");
    assert.equal(julyCharge?.kind, "charge");
    assert.equal(julyCharge?.context, "$2100.00 remaining after credit");
  });

  it("represents one bulk payment as a payment row and distinct satisfied monthly charges", () => {
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

    const payment = ledger.find((row) => row.id === "payment:bulk");
    assert.equal(
      payment?.context,
      "Covers July 2026 through August 2026",
    );
    assert.equal(
      ledger.filter((row) => row.kind === "charge" && row.context === "Satisfied")
        .length,
      2,
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
});
