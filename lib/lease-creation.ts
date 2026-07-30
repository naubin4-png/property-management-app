import { enumerateLeaseMonths } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";
import { firstDayOfWorkspaceMonth } from "@/lib/workspace-time";

export async function createLeaseRecord({
  workspaceId,
  propertyId,
  tenantName,
  tenantEmail,
  firstPeriodMonth,
  lastPeriodMonth,
  rentCents,
  notes,
  reuseTenantId,
  timezone = "UTC",
}: {
  workspaceId: string;
  propertyId: string;
  tenantName: string;
  tenantEmail: string | null;
  firstPeriodMonth: Date;
  lastPeriodMonth: Date | null;
  rentCents: number;
  notes: string | null;
  reuseTenantId?: string;
  timezone?: string;
}) {
  const currentMonth = firstDayOfWorkspaceMonth(new Date(), timezone);
  await prisma.$transaction(async (tx) => {
    const property = await tx.property.findFirst({
      where: { id: propertyId, workspaceId },
      select: { id: true },
    });
    if (!property) {
      throw new Error("Property not found.");
    }

    const activeLease = await tx.lease.findFirst({
      where: {
        workspaceId,
        propertyId,
        OR: [
          { lastPeriodMonth: null },
          { lastPeriodMonth: { gte: currentMonth } },
        ],
      },
      select: { id: true },
    });

    if (activeLease) {
      throw new Error("This property already has an active lease.");
    }

    const tenant = reuseTenantId
      ? await tx.tenant.findFirst({
          where: { id: reuseTenantId, workspaceId },
        })
      : await tx.tenant.create({
          data: { workspaceId, name: tenantName, email: tenantEmail },
        });

    if (!tenant) {
      throw new Error("The selected tenant no longer exists.");
    }

    const lease = await tx.lease.create({
      data: {
        workspaceId,
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
        workspaceId,
        leaseId: lease.id,
        periodMonth,
        amountDueCents: rentCents,
      })),
    });
  });
}
