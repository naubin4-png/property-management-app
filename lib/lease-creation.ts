import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { enumerateMonths } from "@/lib/lease-periods";
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
  tenantEmail: string;
  firstPeriodMonth: Date;
  lastPeriodMonth: Date;
  rentCents: number;
  notes: string;
  reuseTenantId?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const activeLease = await tx.lease.findFirst({
      where: {
        propertyId,
        lastPeriodMonth: { gte: firstDayOfCurrentMonth() },
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
        notes: notes || null,
      },
    });

    await tx.paymentPeriod.createMany({
      data: enumerateMonths(firstPeriodMonth, lastPeriodMonth).map(
        (periodMonth) => ({
          leaseId: lease.id,
          periodMonth,
          amountDueCents: rentCents,
        }),
      ),
    });
  });
}
