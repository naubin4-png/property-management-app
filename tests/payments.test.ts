import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PeriodStatus } from "@prisma/client";

import { allocatePayment } from "../lib/payments";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function createMockTransaction({
  lastPeriodMonth,
  payments: initialPayments = [],
  periods = [],
}: {
  lastPeriodMonth: Date | null;
  payments?: Array<{ id: string; amountCents: number }>;
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
  const payments: Array<{ id: string; amountCents: number }> = [
    ...initialPayments,
  ];
  const paymentPeriods = [...periods];
  let paymentCounter = 0;

  const tx = {
    lease: {
      findUnique: async () => lease,
    },
    payment: {
      aggregate: async ({
        where,
      }: {
        where?: { id?: { not?: string } };
      } = {}) => ({
        _sum: {
          amountCents: payments
            .filter((payment) => payment.id !== where?.id?.not)
            .reduce((total, payment) => total + payment.amountCents, 0),
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
      aggregate: async ({
        where,
      }: {
        where?: { paymentId?: { not?: string } };
      } = {}) => ({
        _sum: {
          amountDueCents: paymentPeriods
            .filter(
              (period) =>
                period.status === PeriodStatus.RECEIVED &&
                period.paymentId !== where?.paymentId?.not,
            )
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
        let updated = 0;
        for (const period of paymentPeriods) {
          if (
            where.id?.in.includes(period.id) ||
            (where.paymentId && period.paymentId === where.paymentId)
          ) {
            Object.assign(period, data);
            updated += 1;
          }
        }
        return { count: updated };
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

  it("reallocates an edited payment and reopens no-longer-covered periods", async () => {
    const { paymentPeriods, tx } = createMockTransaction({
      lastPeriodMonth: null,
      payments: [{ id: "payment-1", amountCents: 200000 }],
      periods: [
        {
          id: "jul",
          periodMonth: month("2026-07"),
          amountDueCents: 100000,
          status: PeriodStatus.RECEIVED,
          paymentId: "payment-1",
        },
        {
          id: "aug",
          periodMonth: month("2026-08"),
          amountDueCents: 100000,
          status: PeriodStatus.RECEIVED,
          paymentId: "payment-1",
        },
      ],
    });

    (tx as {
      payment: {
        update: (input: {
          data: { amountCents: number };
          where: { id: string };
        }) => Promise<{ id: string; amountCents: number }>;
      };
    }).payment.update = async ({ data, where }) => {
      return { id: where.id, amountCents: data.amountCents };
    };

    await allocatePayment(
      tx as never,
      {
        leaseId: "lease-1",
        amountCents: 100000,
        receivedAt: new Date("2026-07-16T00:00:00.000Z"),
        paymentMethod: "CHECK",
        paymentReference: null,
        notes: "Edited to one month",
        clientRequestId: "edit",
      },
      "payment-1",
    );

    assert.deepEqual(
      paymentPeriods.map((period) => ({
        month: period.periodMonth.toISOString().slice(0, 7),
        paymentId: period.paymentId,
        status: period.status,
      })),
      [
        {
          month: "2026-07",
          paymentId: "payment-1",
          status: PeriodStatus.RECEIVED,
        },
        {
          month: "2026-08",
          paymentId: null,
          status: PeriodStatus.PENDING,
        },
      ],
    );
  });
});
