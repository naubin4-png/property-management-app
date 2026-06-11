import { PeriodStatus } from "@prisma/client";

import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type PropertyPeriodStatus = "RECEIVED" | "DUE" | "LATE" | "UPCOMING";

export type PropertyDetailData = {
  id: string;
  name: string;
  notes: string | null;
  activeLease: {
    id: string;
    tenant: {
      id: string;
      name: string;
      email: string;
    };
    rentCents: number;
    firstPeriodMonth: Date;
    lastPeriodMonth: Date;
    notes: string | null;
    dashboardNote: string | null;
    creditBalanceCents: number;
    periods: {
      id: string;
      periodMonth: Date;
      amountDueCents: number;
      status: PropertyPeriodStatus;
    }[];
  } | null;
  payments: {
    id: string;
    receivedAt: Date;
    amountCents: number;
    paymentMethod: string | null;
    paymentReference: string | null;
  }[];
};

export async function getPropertyDetails(
  propertyId: string,
): Promise<PropertyDetailData | null> {
  const [property, settings] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        leases: {
          orderBy: { firstPeriodMonth: "desc" },
          include: {
            tenant: true,
            paymentPeriods: {
              orderBy: { periodMonth: "asc" },
            },
            payments: {
              orderBy: { receivedAt: "desc" },
            },
          },
        },
      },
    }),
    getSettings(),
  ]);

  if (!property) {
    return null;
  }

  const currentMonth = firstDayOfCurrentMonth();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lateCutoff = new Date(today);
  lateCutoff.setUTCDate(lateCutoff.getUTCDate() - settings.gracePeriodDays);
  const activeLease =
    property.leases.find((lease) => lease.lastPeriodMonth >= currentMonth) ?? null;
  const payments = property.leases
    .flatMap((lease) => lease.payments)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  return {
    id: property.id,
    name: property.name,
    notes: property.notes,
    activeLease: activeLease
      ? {
          id: activeLease.id,
          tenant: {
            id: activeLease.tenant.id,
            name: activeLease.tenant.name,
            email: activeLease.tenant.email,
          },
          rentCents: activeLease.rentCents,
          firstPeriodMonth: activeLease.firstPeriodMonth,
          lastPeriodMonth: activeLease.lastPeriodMonth,
          notes: activeLease.notes,
          dashboardNote: activeLease.dashboardNote,
          creditBalanceCents:
            activeLease.payments.reduce(
              (total, payment) => total + payment.amountCents,
              0,
            ) -
            activeLease.paymentPeriods
              .filter((period) => period.status === PeriodStatus.RECEIVED)
              .reduce((total, period) => total + period.amountDueCents, 0),
          periods: activeLease.paymentPeriods.map((period) => ({
            id: period.id,
            periodMonth: period.periodMonth,
            amountDueCents: period.amountDueCents,
            status:
              period.status === PeriodStatus.RECEIVED
                ? "RECEIVED"
                : period.periodMonth > today
                  ? "UPCOMING"
                  : period.periodMonth < lateCutoff
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
      paymentReference: payment.paymentReference,
    })),
  };
}
