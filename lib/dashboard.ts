import { PeriodStatus } from "@prisma/client";

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
  tenantName: string | null;
  rentCents: number | null;
  nextDueDate: Date | null;
  status: DashboardStatus;
  hasActiveLease: boolean;
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
  const [properties, paymentsThisMonth, settings] = await Promise.all([
    prisma.property.findMany({
      orderBy: { name: "asc" },
      include: {
        leases: {
          where: { lastPeriodMonth: { gte: currentMonth } },
          orderBy: { firstPeriodMonth: "desc" },
          take: 1,
          include: {
            tenant: true,
            paymentPeriods: {
              where: {
                status: { in: [PeriodStatus.PENDING, PeriodStatus.LATE] },
              },
              orderBy: { periodMonth: "asc" },
            },
          },
        },
      },
    }),
    prisma.payment.count({
      where: {
        receivedAt: {
          gte: currentMonth,
          lt: nextMonth,
        },
      },
    }),
    getSettings(),
  ]);

  const today = new Date();
  const rows: DashboardProperty[] = properties.map((property) => {
    const lease = property.leases[0];

    if (!lease) {
      return {
        id: property.id,
        name: property.name,
        tenantName: null,
        rentCents: null,
        nextDueDate: null,
        status: "NO_LEASE",
        hasActiveLease: false,
      };
    }

    const nextDue = lease.paymentPeriods[0] ?? null;
    const hasLatePeriod = lease.paymentPeriods.some(
      (period) => period.status === PeriodStatus.LATE,
    );
    const status: DashboardStatus = hasLatePeriod
      ? "LATE"
      : nextDue && nextDue.periodMonth <= today
        ? "DUE"
        : "PAID";

    return {
      id: property.id,
      name: property.name,
      tenantName: lease.tenant.name,
      rentCents: lease.rentCents,
      nextDueDate: nextDue?.periodMonth ?? null,
      status,
      hasActiveLease: true,
    };
  });

  const needsAttention = rows.filter(
    (property) => property.status === "LATE" || property.status === "DUE",
  );
  const allGood = rows.filter(
    (property) => property.status !== "LATE" && property.status !== "DUE",
  );

  return {
    properties: rows,
    needsAttention,
    allGood,
    summary: {
      activeProperties: rows.filter((property) => property.hasActiveLease).length,
      paymentsThisMonth,
      needingAttention: needsAttention.length,
    },
    gracePeriodDays: settings.gracePeriodDays,
  };
}
