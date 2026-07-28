import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { enumerateLeaseMonths } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

export async function createLeaseRecord({
  propertyId,
  tenantName,
  tenantEmail,
  firstPeriodMonth,
  lastPeriodMonth,
  rentCents,
  notes,
  reuseTenantId,
}: {
  propertyId: string;
  tenantName: string;
  tenantEmail: string | null;
  firstPeriodMonth: Date;
  lastPeriodMonth: Date | null;
  rentCents: number;
  notes: string | null;
  reuseTenantId?: string;
}) {
  const currentMonth = firstDayOfCurrentMonth();
  await prisma.$transaction(async (tx) => {
    const activeLease = await tx.lease.findFirst({
      where: {
        propertyId,
        OR: [
          { lastPeriodMonth: null },
          { lastPeriodMonth: { gte: currentMonth } },
        ],
      },
      select: { id: true },
    });

    if (activeLease) {
      throw new Error("This space already has an active lease.");
    }

    const tenant = reuseTenantId
      ? await tx.tenant.findUnique({ where: { id: reuseTenantId } })
      : await tx.tenant.create({
          data: { name: tenantName, email: tenantEmail },
        });

    if (!tenant) {
      throw new Error("The selected tenant no longer exists.");
    }

    const lease = await tx.lease.create({
      data: {
        propertyId,
        tenantId: tenant.id,
        firstPeriodMonth,
        lastPeriodMonth,
        rentCents,
        notes,
      },
    });

    await tx.paymentPeriod.createMany({
      data: enumerateLeaseMonths({
        firstPeriodMonth,
        lastPeriodMonth,
        minimumThrough: currentMonth,
      }).map((periodMonth) => ({
        leaseId: lease.id,
        periodMonth,
        amountDueCents: rentCents,
      })),
    });
  });
}
