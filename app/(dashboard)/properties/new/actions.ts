"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  enumerateMonths,
  parseDollarAmount,
  parseMonth,
} from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

export type AddPropertyActionState = {
  error: string | null;
};

export async function createPropertyWithLease(
  _state: AddPropertyActionState,
  formData: FormData,
): Promise<AddPropertyActionState> {
  try {
    const propertyName = String(formData.get("propertyName") ?? "").trim();
    const propertyNotes = String(formData.get("propertyNotes") ?? "").trim();
    const tenantName = String(formData.get("tenantName") ?? "").trim();
    const tenantEmail = String(formData.get("tenantEmail") ?? "")
      .trim()
      .toLowerCase();
    const firstPeriodMonth = parseMonth(
      String(formData.get("firstPeriodMonth") ?? ""),
    );
    const lastPeriodMonth = parseMonth(
      String(formData.get("lastPeriodMonth") ?? ""),
    );
    const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
    const leaseNotes = String(formData.get("leaseNotes") ?? "").trim();

    if (
      !propertyName ||
      !tenantName ||
      !tenantEmail ||
      !firstPeriodMonth ||
      !lastPeriodMonth ||
      !rentCents
    ) {
      throw new Error("Complete all required fields.");
    }

    if (lastPeriodMonth < firstPeriodMonth) {
      throw new Error(
        "Lease end must be the same as or after the first rent month.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          name: propertyName,
          notes: propertyNotes || null,
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
          notes: leaseNotes || null,
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

    revalidatePath("/");
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to create property.",
    };
  }

  redirect("/");
}
