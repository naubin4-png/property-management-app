"use server";

import { redirect } from "next/navigation";

import { enumerateMonths, parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

export async function updateLease(
  propertyId: string,
  leaseId: string,
  formData: FormData,
) {
  const newLastPeriodMonth = parseMonth(String(formData.get("lastPeriodMonth") ?? ""));
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, propertyId },
  });

  if (!lease || !newLastPeriodMonth || !rentCents) {
    redirect(`/properties/${propertyId}/leases/${leaseId}/edit?error=Invalid%20lease%20details.`);
  }

  if (newLastPeriodMonth <= lease.lastPeriodMonth) {
    redirect(
      `/properties/${propertyId}/leases/${leaseId}/edit?error=${encodeURIComponent(
        "Leases can only be extended, not shortened. To change tenants, let the lease expire and create a new one.",
      )}`,
    );
  }

  const extensionStart = new Date(
    Date.UTC(
      lease.lastPeriodMonth.getUTCFullYear(),
      lease.lastPeriodMonth.getUTCMonth() + 1,
      1,
    ),
  );

  await prisma.$transaction([
    prisma.lease.update({
      where: { id: lease.id },
      data: {
        lastPeriodMonth: newLastPeriodMonth,
        rentCents,
        notes: notes || null,
      },
    }),
    prisma.paymentPeriod.createMany({
      data: enumerateMonths(extensionStart, newLastPeriodMonth).map((periodMonth) => ({
        leaseId: lease.id,
        periodMonth,
        amountDueCents: rentCents,
      })),
      skipDuplicates: true,
    }),
    prisma.paymentPeriod.updateMany({
      where: {
        leaseId: lease.id,
        periodMonth: { gt: new Date() },
      },
      data: { amountDueCents: rentCents },
    }),
  ]);

  redirect(`/properties/${propertyId}`);
}
