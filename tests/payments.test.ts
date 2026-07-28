import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PeriodStatus } from "@prisma/client";

import { allocatePayment } from "../lib/payments";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function createMockTransaction({
  lastPeriodMonth,
  periods = [],
}: {
  lastPeriodMonth: Date | null;
  periods?: Array<{
    id: string;
    periodMonth: Date;
    amountDueCents: number;
    status: PeriodStatus;
    paymentId: string | null;
  }>;
}) {
  const lease = {
    id: "lease-1",
    firstPeriodMonth: month("2026-07"),
    lastPeriodMonth,
    rentCents: 100000,
  };
  const payments: Array<{ id: string; amountCents: number }> = [];
  const paymentPeriods = [...periods];
  let paymentCounter = 0;

  const tx = {
    lease: {
      findUnique: async () => lease,
    },
    payment: {
      aggregate: async () => ({
        _sum: {
          amountCents: payments.reduce(
            (total, payment) => total + payment.amountCents,
            0,
          ),
        },
      }),
      create: async ({ data }: { data: { amountCents: number } }) => {
        const payment = {
          id: `payment-${(paymentCounter += 1)}`,
          amountCents: data.amountCents,
        };
        payments.push(payment);
        return payment;
      },
      update: async () => {
        throw new Error("Unexpected update");
      },
    },
    paymentPeriod: {
      aggregate: async () => ({
        _sum: {
          amountDueCents: paymentPeriods
            .filter((period) => period.status === PeriodStatus.RECEIVED)
            .reduce((total, period) => total + period.amountDueCents, 0),
        },
      }),
      createMany: async ({
        data,
      }: {
        data: Array<{
          leaseId: string;
          periodMonth: Date;
          amountDueCents: number;
        }>;
      }) => {
        for (const item of data) {
          const exists = paymentPeriods.some(
            (period) =>
              period.periodMonth.getTime() === item.periodMonth.getTime(),
          );
          if (!exists) {
            paymentPeriods.push({
              id: `period-${item.periodMonth.toISOString().slice(0, 7)}`,
              periodMonth: item.periodMonth,
              amountDueCents: item.amountDueCents,
              status: PeriodStatus.PENDING,
              paymentId: null,
            });
          }
        }
        return { count: data.length };
      },
      findMany: async () =>
        paymentPeriods
          .filter(
            (period) =>
              period.status === PeriodStatus.PENDING ||
              period.status === PeriodStatus.LATE,
          )
          .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime()),
      findFirst: async () =>
        paymentPeriods
          .slice()
          .sort((a, b) => b.periodMonth.getTime() - a.periodMonth.getTime())[0] ??
        null,
      updateMany: async ({
        where,
        data,
      }: {
        where: { id?: { in: string[] }; paymentId?: string };
        data: Partial<{
          status: PeriodStatus;
          paymentId: string | null;
        }>;
      }) => {
        for (const period of paymentPeriods) {
          if (where.id?.in.includes(period.id) || where.paymentId) {
            Object.assign(period, data);
          }
        }
        return { count: paymentPeriods.length };
      },
    },
  };

  return { paymentPeriods, tx };
}

describe("payment allocation", () => {
  it("keeps a partial payment as credit without marking a period received", async () => {
    const { paymentPeriods, tx } = createMockTransaction({
      lastPeriodMonth: null,
    });

    await allocatePayment(tx as never, {
      leaseId: "lease-1",
      amountCents: 50000,
      receivedAt: new Date("2026-07-10T00:00:00.000Z"),
      paymentMethod: "CHECK",
      paymentReference: null,
      notes: null,
      clientRequestId: "partial",
    });

    assert.deepEqual(
      paymentPeriods.map((period) => period.status),
      [PeriodStatus.PENDING],
    );
  });

  it("creates enough future periods for open-ended multi-month advance payments", async () => {
    const { paymentPeriods, tx } = createMockTransaction({
      lastPeriodMonth: null,
    });

    await allocatePayment(tx as never, {
      leaseId: "lease-1",
      amountCents: 300000,
      receivedAt: new Date("2026-07-10T00:00:00.000Z"),
      paymentMethod: "CHECK",
      paymentReference: null,
      notes: null,
      clientRequestId: "advance",
    });

    assert.deepEqual(
      paymentPeriods.map((period) => period.periodMonth.toISOString().slice(0, 7)),
      ["2026-07", "2026-08", "2026-09"],
    );
    assert.deepEqual(
      paymentPeriods.map((period) => period.status),
      [PeriodStatus.RECEIVED, PeriodStatus.RECEIVED, PeriodStatus.RECEIVED],
    );
  });
});
