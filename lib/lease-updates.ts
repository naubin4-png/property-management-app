import { Prisma } from "@prisma/client";

import { enumerateMonths } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export async function updateLeaseRecord({
  propertyId,
  leaseId,
  lastPeriodMonth,
  rentCents,
  notes,
}: {
  propertyId: string;
  leaseId: string;
  lastPeriodMonth: Date;
  rentCents: number;
  notes: string;
}) {
  await prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, propertyId },
    });

    if (!lease) {
      throw new Error("Lease not found.");
    }

    if (lastPeriodMonth <= lease.lastPeriodMonth) {
      throw new Error(
        "Leases can only be extended, not shortened. Choose a later end month.",
      );
    }

    const extensionStart = new Date(
      Date.UTC(
        lease.lastPeriodMonth.getUTCFullYear(),
        lease.lastPeriodMonth.getUTCMonth() + 1,
        1,
      ),
    );

    await tx.lease.update({
      where: { id: lease.id },
      data: {
        lastPeriodMonth,
        rentCents,
        notes: notes || null,
      },
    });
    await tx.paymentPeriod.createMany({
      data: enumerateMonths(extensionStart, lastPeriodMonth).map(
        (periodMonth) => ({
          leaseId: lease.id,
          periodMonth,
          amountDueCents: rentCents,
        }),
      ),
      skipDuplicates: true,
    });
    await tx.paymentPeriod.updateMany({
      where: {
        leaseId: lease.id,
        periodMonth: { gt: new Date() },
      },
      data: { amountDueCents: rentCents },
    });
  }, transactionOptions);
}
