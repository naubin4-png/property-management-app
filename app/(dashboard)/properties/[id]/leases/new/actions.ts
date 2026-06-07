"use server";

import { redirect } from "next/navigation";

import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import {
  enumerateMonths,
  parseDollarAmount,
  parseMonth,
} from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

export async function findTenantByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return prisma.tenant.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
}

export async function createLease(propertyId: string, formData: FormData) {
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantEmail = String(formData.get("tenantEmail") ?? "").trim().toLowerCase();
  const firstPeriodMonth = parseMonth(String(formData.get("firstPeriodMonth") ?? ""));
  const lastPeriodMonth = parseMonth(String(formData.get("lastPeriodMonth") ?? ""));
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const reuseTenantId = String(formData.get("reuseTenantId") ?? "").trim();

  if (!tenantName || !tenantEmail || !firstPeriodMonth || !lastPeriodMonth || !rentCents) {
    redirect(`/properties/${propertyId}/leases/new?error=Complete%20all%20required%20fields.`);
  }

  if (lastPeriodMonth < firstPeriodMonth) {
    redirect(
      `/properties/${propertyId}/leases/new?error=Lease%20end%20must%20be%20the%20same%20as%20or%20after%20the%20first%20rent%20month.`,
    );
  }

  const activeLease = await prisma.lease.findFirst({
    where: {
      propertyId,
      lastPeriodMonth: { gte: firstDayOfCurrentMonth() },
    },
    select: { id: true },
  });

  if (activeLease) {
    redirect(`/properties/${propertyId}?error=This%20property%20already%20has%20an%20active%20lease.`);
  }

  await prisma.$transaction(async (transaction) => {
    const tenant = reuseTenantId
      ? await transaction.tenant.findUnique({ where: { id: reuseTenantId } })
      : await transaction.tenant.create({
          data: { name: tenantName, email: tenantEmail },
        });

    if (!tenant) {
      throw new Error("The selected tenant no longer exists.");
    }

    const lease = await transaction.lease.create({
      data: {
        propertyId,
        tenantId: tenant.id,
        firstPeriodMonth,
        lastPeriodMonth,
        rentCents,
        notes: notes || null,
      },
    });

    await transaction.paymentPeriod.createMany({
      data: enumerateMonths(firstPeriodMonth, lastPeriodMonth).map((periodMonth) => ({
        leaseId: lease.id,
        periodMonth,
        amountDueCents: rentCents,
      })),
    });
  });

  redirect(`/properties/${propertyId}`);
}
