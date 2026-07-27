import { PeriodStatus, TriggerType } from "@prisma/client";

import {
  firstDayOfCurrentMonth,
  firstDayOfNextMonth,
} from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type DashboardStatus = "PAID" | "DUE" | "LATE" | "NO_LEASE";

export type DashboardProperty = {
  id: string;
  name: string;
  leaseId: string | null;
  rentCents: number | null;
  nextDueDate: Date | null;
  status: DashboardStatus;
  hasActiveLease: boolean;
  dashboardNote: string | null;
  latestEmail: {
    label: string;
    sentAt: Date;
  } | null;
  advancePayment: {
    monthsPaid: number;
    paidAt: Date;
    paidThrough: Date;
  } | null;
  billingPeriodMonth: Date | null;
  billingPeriodPaidAt: Date | null;
  billingPeriodRemainingCents: number;
  amountOwedCents: number;
  creditBalanceCents: number;
};

async function ensureDashboardPeriods() {
  const currentMonth = firstDayOfCurrentMonth();
  const nextMonth = firstDayOfNextMonth();
  const activeLeases = await prisma.lease.findMany({
    where: { lastPeriodMonth: { gte: currentMonth } },
    select: {
      id: true,
      firstPeriodMonth: true,
      lastPeriodMonth: true,
      rentCents: true,
    },
  });

  const periods = activeLeases.flatMap((lease) =>
    [currentMonth, nextMonth]
      .filter(
        (periodMonth) =>
          periodMonth >= lease.firstPeriodMonth &&
          periodMonth <= lease.lastPeriodMonth,
      )
      .map((periodMonth) => ({
        leaseId: lease.id,
        periodMonth,
        amountDueCents: lease.rentCents,
      })),
  );

  if (periods.length > 0) {
    await prisma.paymentPeriod.createMany({
      data: periods,
      skipDuplicates: true,
    });
  }
}

export async function getDashboardData() {
  await ensureDashboardPeriods();

  const currentMonth = firstDayOfCurrentMonth();
  const nextMonth = firstDayOfNextMonth();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [properties, settings] =
    await Promise.all([
      prisma.property.findMany({
        orderBy: { name: "asc" },
        include: {
          leases: {
            where: {
              firstPeriodMonth: { lte: currentMonth },
              lastPeriodMonth: { gte: currentMonth },
            },
            orderBy: { firstPeriodMonth: "desc" },
            take: 1,
            include: {
              payments: {
                orderBy: { receivedAt: "desc" },
              },
              paymentPeriods: {
                orderBy: { periodMonth: "asc" },
              },
            },
          },
        },
      }),
      getSettings(),
    ]);

  const emailLookupKeys: { leaseId: string; periodMonth: Date }[] = [];
  const emailPeriodByLease = new Map<string, Date>();
  const lateCutoff = new Date(today);
  lateCutoff.setUTCDate(lateCutoff.getUTCDate() - settings.gracePeriodDays);
  const rows: DashboardProperty[] = properties.map((property) => {
    const lease = property.leases[0];

    if (!lease) {
      return {
        id: property.id,
        name: property.name,
        leaseId: null,
        rentCents: null,
        nextDueDate: null,
        status: "NO_LEASE",
        hasActiveLease: false,
        dashboardNote: null,
        latestEmail: null,
        advancePayment: null,
        billingPeriodMonth: null,
        billingPeriodPaidAt: null,
        billingPeriodRemainingCents: 0,
        amountOwedCents: 0,
        creditBalanceCents: 0,
      };
    }

    const paymentById = new Map(
      lease.payments.map((payment) => [payment.id, payment]),
    );
    const billingPeriod = lease.paymentPeriods.find(
      (period) => period.periodMonth.getTime() === currentMonth.getTime(),
    );
    const unpaidPeriods = lease.paymentPeriods.filter(
      (period) =>
        period.status === PeriodStatus.PENDING ||
        period.status === PeriodStatus.LATE,
    );
    const nextDue = unpaidPeriods[0] ?? null;
    if (
      currentMonth >= lease.firstPeriodMonth &&
      currentMonth <= lease.lastPeriodMonth
    ) {
      emailLookupKeys.push({
        leaseId: lease.id,
        periodMonth: currentMonth,
      });
      emailPeriodByLease.set(lease.id, currentMonth);
    }
    const allocatedCents = lease.paymentPeriods
      .filter((period) => period.status === PeriodStatus.RECEIVED)
      .reduce((total, period) => total + period.amountDueCents, 0);
    const paidCents = lease.payments.reduce(
      (total, payment) => total + payment.amountCents,
      0,
    );
    const hasEarlierUnpaid = unpaidPeriods.some(
      (period) => period.periodMonth < currentMonth,
    );
    const creditAppliedToBillingPeriod =
      billingPeriod &&
      billingPeriod.status !== PeriodStatus.RECEIVED &&
      !hasEarlierUnpaid
        ? Math.min(
            Math.max(paidCents - allocatedCents, 0),
            billingPeriod.amountDueCents,
          )
        : 0;
    const billingPeriodRemainingCents = billingPeriod
      ? billingPeriod.status === PeriodStatus.RECEIVED
        ? 0
        : Math.max(
            billingPeriod.amountDueCents - creditAppliedToBillingPeriod,
            0,
          )
      : 0;
    const billingPeriodPaidAt =
      billingPeriod?.paymentId && billingPeriod.status === PeriodStatus.RECEIVED
        ? (paymentById.get(billingPeriod.paymentId)?.receivedAt ?? null)
        : null;
    const status: DashboardStatus =
      billingPeriodRemainingCents === 0
        ? "PAID"
        : billingPeriod?.status === PeriodStatus.LATE ||
            (billingPeriod?.periodMonth &&
              billingPeriod.periodMonth < lateCutoff)
          ? "LATE"
          : "DUE";
    const paidPeriodsByPayment = lease.payments.map((payment) => {
      const paidPeriods = lease.paymentPeriods
        .filter(
          (period) =>
            period.status === PeriodStatus.RECEIVED &&
            period.paymentId === payment.id,
        )
        .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime());
      return {
        monthsPaid: paidPeriods.length,
        paidAt: payment.receivedAt,
        paidThrough: paidPeriods.at(-1)?.periodMonth,
      };
    });
    const advancePayment =
      nextDue && nextDue.periodMonth > nextMonth
        ? paidPeriodsByPayment.find(
            (payment) => payment.monthsPaid > 1 && payment.paidThrough,
          ) ?? null
        : null;

    return {
      id: property.id,
      name: property.name,
      leaseId: lease.id,
      rentCents: lease.rentCents,
      nextDueDate: nextDue?.periodMonth ?? null,
      status,
      hasActiveLease: true,
      dashboardNote: lease.dashboardNote,
      latestEmail: null,
      advancePayment: advancePayment
        ? {
            monthsPaid: advancePayment.monthsPaid,
            paidAt: advancePayment.paidAt,
            paidThrough: advancePayment.paidThrough!,
          }
        : null,
      billingPeriodMonth: billingPeriod?.periodMonth ?? currentMonth,
      billingPeriodPaidAt,
      billingPeriodRemainingCents,
      amountOwedCents: billingPeriodRemainingCents,
      creditBalanceCents: paidCents - allocatedCents,
    };
  });

  const emailLogs =
    emailLookupKeys.length > 0
      ? await prisma.emailLog.findMany({
          where: {
            OR: emailLookupKeys.map((key) => ({
              leaseId: key.leaseId,
              periodMonth: key.periodMonth,
            })),
          },
          orderBy: { sentAt: "desc" },
        })
      : [];
  const emailLogMap = new Map<string, (typeof emailLogs)[number]>();
  for (const log of emailLogs) {
    if (!log.leaseId || !log.periodMonth) {
      continue;
    }
    const key = `${log.leaseId}:${log.periodMonth.toISOString()}`;
    if (!emailLogMap.has(key)) {
      emailLogMap.set(key, log);
    }
  }
  const rowsWithEmail = rows.map((row) => {
    if (!row.leaseId) {
      return row;
    }
    const emailPeriod = emailPeriodByLease.get(row.leaseId);
    if (!emailPeriod) {
      return row;
    }
    const log = emailLogMap.get(`${row.leaseId}:${emailPeriod.toISOString()}`);
    if (!log) {
      return row;
    }
    return {
      ...row,
      latestEmail: {
        label:
          log.triggerType === TriggerType.RENT_REMINDER
            ? "Reminder sent"
            : "Late notice sent",
        sentAt: log.sentAt,
      },
    };
  });

  const needsAttention = rowsWithEmail.filter(
    (property) =>
      property.hasActiveLease && property.billingPeriodRemainingCents > 0,
  );
  const allGood = rowsWithEmail.filter(
    (property) =>
      !property.hasActiveLease || property.billingPeriodRemainingCents === 0,
  );
  const collectedForBillingPeriodCents = rowsWithEmail.reduce(
    (total, property) =>
      total +
      Math.max((property.rentCents ?? 0) - property.billingPeriodRemainingCents, 0),
    0,
  );
  const stillDueCents = rowsWithEmail.reduce(
    (total, property) => total + property.billingPeriodRemainingCents,
    0,
  );

  return {
    properties: rowsWithEmail,
    needsAttention,
    allGood,
    summary: {
      billingPeriodMonth: currentMonth,
      collectedThisMonthCents: collectedForBillingPeriodCents,
      outstandingCents: stillDueCents,
    },
  };
}
