"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  enumerateLeaseMonths,
  parseDollarAmount,
  parseMonth,
} from "@/lib/lease-periods";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";

export type AddPropertyActionState = {
  error: string | null;
};

export async function createPropertyWithLease(
  _state: AddPropertyActionState,
  formData: FormData,
): Promise<AddPropertyActionState> {
  let redirectHref = "/";

  try {
    const propertyName = String(formData.get("propertyName") ?? "").trim();
    const tenantName = String(formData.get("tenantName") ?? "").trim();
    const tenantEmail =
      String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;
    const firstPeriodMonth = parseMonth(
      String(formData.get("firstPeriodMonth") ?? ""),
    );
    const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
    const lastPeriodMonth = rawLastPeriodMonth
      ? parseMonth(rawLastPeriodMonth)
      : null;
    const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
    const currentMonth = firstDayOfCurrentMonth();

    if (
      !propertyName ||
      !tenantName ||
      !firstPeriodMonth ||
      !rentCents
    ) {
      throw new Error("Complete all required fields.");
    }

    if (rawLastPeriodMonth && !lastPeriodMonth) {
      throw new Error("Choose a valid lease end month.");
    }

    if (lastPeriodMonth && lastPeriodMonth < firstPeriodMonth) {
      throw new Error(
        "Lease end must be the same as or after the first rent month.",
      );
    }

    if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
      throw new Error("Enter a valid tenant email.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          name: propertyName,
          notes: null,
        },
      });
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          email: tenantEmail,
        },
      });
      const lease = await tx.lease.create({
        data: {
          propertyId: property.id,
          tenantId: tenant.id,
          firstPeriodMonth,
          lastPeriodMonth,
          rentCents,
          notes: null,
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

      return { propertyId: property.id };
    });

    revalidatePath("/");
    const promptForCurrentMonth =
      firstPeriodMonth.getTime() === currentMonth.getTime();
    redirectHref = promptForCurrentMonth
      ? `/?leaseAdded=1&propertyId=${created.propertyId}`
      : `/?property=${created.propertyId}`;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to create property.",
    };
  }

  redirect(redirectHref);
}
