import { PeriodStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  deriveCreditBalance,
  deriveCurrentRentSummary,
  deriveRentLedger,
  type CurrentRentSummary,
  type RentLedgerRow,
} from "@/lib/rent-ledger";
import {
  firstDayOfNextWorkspaceMonth,
  firstDayOfWorkspaceMonth,
  workspaceCalendarDate,
} from "@/lib/workspace-time";

export type PropertyPeriodStatus = "RECEIVED" | "DUE" | "LATE" | "UPCOMING";

export type PropertyDetailData = {
  id: string;
  name: string;
  activeLease: {
    id: string;
      tenant: {
        id: string;
        name: string;
        email: string | null;
        leaseUseCount: number;
      };
      rentCents: number;
      firstPeriodMonth: Date;
      lastPeriodMonth: Date | null;
    notes: string | null;
    creditBalanceCents: number;
    currentRent: CurrentRentSummary | null;
    ledger: RentLedgerRow[];
    periods: {
      id: string;
      periodMonth: Date;
      amountDueCents: number;
      status: PropertyPeriodStatus;
      paymentId: string | null;
    }[];
  } | null;
  payments: {
    id: string;
    receivedAt: Date;
    amountCents: number;
    paymentMethod: string | null;
    notes: string | null;
  }[];
};

export async function getPropertyDetails(
  propertyId: string,
  workspaceId: string,
  timeZone = "UTC",
): Promise<PropertyDetailData | null> {
  const currentMonth = firstDayOfWorkspaceMonth(new Date(), timeZone);
  const nextMonth = firstDayOfNextWorkspaceMonth(new Date(), timeZone);
  const property = await prisma.property.findFirst({
    where: { id: propertyId, workspaceId },
    include: {
      leases: {
        orderBy: { firstPeriodMonth: "desc" },
        include: {
          tenant: {
            include: {
              _count: {
                select: { leases: true },
              },
            },
          },
          paymentPeriods: {
            where: {
              OR: [
                { periodMonth: { lte: nextMonth } },
                { status: PeriodStatus.RECEIVED },
                { paymentId: { not: null } },
              ],
            },
            orderBy: { periodMonth: "asc" },
          },
          payments: {
            orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  if (!property) {
    return null;
  }

  const today = workspaceCalendarDate(new Date(), timeZone);
  const activeLease =
    property.leases.find(
      (lease) => !lease.lastPeriodMonth || lease.lastPeriodMonth >= currentMonth,
    ) ?? null;
  const payments = property.leases
    .flatMap((lease) => lease.payments)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  const emailLogs = activeLease
    ? await prisma.emailLog.findMany({
        where: {
          workspaceId,
          leaseId: activeLease.id,
          periodMonth: currentMonth,
        },
        orderBy: { sentAt: "desc" },
      })
    : [];
  const creditBalanceCents = activeLease
    ? deriveCreditBalance({
        payments: activeLease.payments,
        periods: activeLease.paymentPeriods,
      })
    : 0;

  return {
    id: property.id,
    name: property.name,
    activeLease: activeLease
      ? {
          id: activeLease.id,
          tenant: {
            id: activeLease.tenant.id,
            name: activeLease.tenant.name,
            email: activeLease.tenant.email,
            leaseUseCount: activeLease.tenant._count.leases,
          },
          rentCents: activeLease.rentCents,
          firstPeriodMonth: activeLease.firstPeriodMonth,
          lastPeriodMonth: activeLease.lastPeriodMonth,
          notes: activeLease.notes,
          creditBalanceCents,
          currentRent: deriveCurrentRentSummary({
            creditBalanceCents,
            emailLogs,
            periods: activeLease.paymentPeriods,
          }),
          ledger: deriveRentLedger({
            creditBalanceCents,
            payments: activeLease.payments,
            periods: activeLease.paymentPeriods,
            today,
          }),
          periods: activeLease.paymentPeriods.map((period) => ({
            id: period.id,
            periodMonth: period.periodMonth,
            amountDueCents: period.amountDueCents,
            paymentId: period.paymentId,
            status:
              period.status === PeriodStatus.RECEIVED
                ? "RECEIVED"
                : period.periodMonth > today
                  ? "UPCOMING"
                  : period.status === PeriodStatus.LATE
                    ? "LATE"
                    : "DUE",
          })),
        }
      : null,
    payments: payments.map((payment) => ({
      id: payment.id,
      receivedAt: payment.receivedAt,
      amountCents: payment.amountCents,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
    })),
  };
}
