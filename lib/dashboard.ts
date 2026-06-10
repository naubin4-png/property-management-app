import { PeriodStatus, TriggerType } from "@prisma/client";

import {
  firstDayOfCurrentMonth,
  firstDayOfNextMonth,
} from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";

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
  const [properties, collectedThisMonth, outstanding] = await Promise.all([
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
            payments: true,
            paymentPeriods: {
              orderBy: { periodMonth: "asc" },
            },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: {
        receivedAt: {
          gte: currentMonth,
          lt: nextMonth,
        },
      },
      _sum: { amountCents: true },
    }),
    prisma.paymentPeriod.aggregate({
      where: {
        status: { in: [PeriodStatus.PENDING, PeriodStatus.LATE] },
        lease: {
          firstPeriodMonth: { lte: currentMonth },
          lastPeriodMonth: { gte: currentMonth },
        },
      },
      _sum: { amountDueCents: true },
    }),
  ]);

  const emailLookupKeys: { leaseId: string; periodMonth: Date }[] = [];
  const emailPeriodByLease = new Map<string, Date>();
  const today = new Date();
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
        amountOwedCents: 0,
        creditBalanceCents: 0,
      };
    }

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
    const hasLatePeriod = unpaidPeriods.some(
      (period) => period.status === PeriodStatus.LATE,
    );
    const status: DashboardStatus = hasLatePeriod
      ? "LATE"
      : nextDue && nextDue.periodMonth <= today
        ? "DUE"
        : "PAID";

    const allocatedCents = lease.paymentPeriods
      .filter((period) => period.status === PeriodStatus.RECEIVED)
      .reduce((total, period) => total + period.amountDueCents, 0);
    const paidCents = lease.payments.reduce(
      (total, payment) => total + payment.amountCents,
      0,
    );

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
      amountOwedCents: unpaidPeriods.reduce(
        (total, period) => total + period.amountDueCents,
        0,
      ),
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
            : "Late notice",
        sentAt: log.sentAt,
      },
    };
  });

  const needsAttention = rowsWithEmail.filter(
    (property) => property.status === "LATE" || property.status === "DUE",
  );
  const allGood = rowsWithEmail.filter(
    (property) => property.status !== "LATE" && property.status !== "DUE",
  );

  return {
    properties: rowsWithEmail,
    needsAttention,
    allGood,
    summary: {
      collectedThisMonthCents: collectedThisMonth._sum.amountCents ?? 0,
      outstandingCents: outstanding._sum.amountDueCents ?? 0,
    },
  };
}
