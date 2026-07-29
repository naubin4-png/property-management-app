import { PeriodStatus, Prisma } from "@prisma/client";

import { enumerateMonths, addMonths } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";
import { firstDayOfWorkspaceMonth } from "@/lib/workspace-time";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export async function updateLeaseRecord({
  workspaceId,
  propertyId,
  leaseId,
  lastPeriodMonth,
  rentCents,
  notes,
  timezone = "UTC",
}: {
  workspaceId: string;
  propertyId: string;
  leaseId: string;
  lastPeriodMonth: Date | null;
  rentCents: number;
  notes: string;
  timezone?: string;
}) {
  await updatePropertyLeaseDetails({
    workspaceId,
    propertyId,
    leaseId,
    lastPeriodMonth,
    rentCents,
    notes,
    timezone,
  });
}

export async function updatePropertyLeaseDetails({
  workspaceId,
  propertyId,
  leaseId,
  lastPeriodMonth,
  notes,
  propertyName,
  rentCents,
  tenantEmail,
  tenantName,
  timezone = "UTC",
}: {
  workspaceId: string;
  propertyId: string;
  leaseId: string;
  lastPeriodMonth: Date | null;
  notes: string;
  propertyName?: string;
  rentCents: number;
  tenantEmail?: string | null;
  tenantName?: string;
  timezone?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, propertyId, workspaceId },
    });

    if (!lease) {
      throw new Error("Lease not found.");
    }

    if (lastPeriodMonth && lastPeriodMonth < lease.firstPeriodMonth) {
      throw new Error("Lease end cannot be before tracking starts.");
    }

    const currentEnd = lease.lastPeriodMonth;
    const isShortening =
      lastPeriodMonth !== null &&
      (currentEnd === null || lastPeriodMonth < currentEnd);

    if (isShortening) {
      const removedPeriods = await tx.paymentPeriod.findMany({
        where: {
          leaseId: lease.id,
          periodMonth: { gt: lastPeriodMonth },
        },
        select: {
          id: true,
          paymentId: true,
          status: true,
        },
      });
      const linkedHistory = removedPeriods.find(
        (period) =>
          period.paymentId !== null || period.status === PeriodStatus.RECEIVED,
      );
      if (linkedHistory) {
        throw new Error(
          "This lease cannot be shortened because paid or payment-linked history exists after the selected end month.",
        );
      }

      await tx.paymentPeriod.deleteMany({
        where: {
          leaseId: lease.id,
          periodMonth: { gt: lastPeriodMonth },
          paymentId: null,
          status: { in: [PeriodStatus.PENDING, PeriodStatus.LATE] },
        },
      });
    }

    if (propertyName !== undefined) {
      await tx.property.update({
        where: { id: propertyId, workspaceId },
        data: { name: propertyName },
      });
    }

    if (tenantName !== undefined) {
      await tx.tenant.update({
        where: { id: lease.tenantId, workspaceId },
        data: { name: tenantName, email: tenantEmail ?? null },
      });
    }

      await tx.lease.update({
      where: { id: lease.id, workspaceId },
      data: {
        lastPeriodMonth,
        rentCents,
        notes: notes || null,
      },
    });
    if (
      lastPeriodMonth &&
      currentEnd &&
      lastPeriodMonth > currentEnd
    ) {
      const extensionStart = addMonths(currentEnd, 1);

      await tx.paymentPeriod.createMany({
        data: enumerateMonths(extensionStart, lastPeriodMonth).map(
          (periodMonth) => ({
            workspaceId,
            leaseId: lease.id,
            periodMonth,
            amountDueCents: rentCents,
          }),
        ),
        skipDuplicates: true,
      });
    }
    if (lastPeriodMonth && !currentEnd && lastPeriodMonth >= lease.firstPeriodMonth) {
      await tx.paymentPeriod.createMany({
        data: enumerateMonths(lease.firstPeriodMonth, lastPeriodMonth).map(
          (periodMonth) => ({
            workspaceId,
            leaseId: lease.id,
            periodMonth,
            amountDueCents: rentCents,
          }),
        ),
        skipDuplicates: true,
      });
    }
    await tx.paymentPeriod.updateMany({
      where: {
        leaseId: lease.id,
        periodMonth: {
          gt: firstDayOfWorkspaceMonth(new Date(), timezone),
        },
        paymentId: null,
        status: { in: [PeriodStatus.PENDING, PeriodStatus.LATE] },
      },
      data: { amountDueCents: rentCents },
    });
  }, transactionOptions);
}
