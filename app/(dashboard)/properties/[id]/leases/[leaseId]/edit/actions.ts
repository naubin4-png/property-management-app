"use server";

import { redirect } from "next/navigation";

import { parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import { updateLeaseRecord } from "@/lib/lease-updates";

export async function updateLease(
  propertyId: string,
  leaseId: string,
  formData: FormData,
) {
  const newLastPeriodMonth = parseMonth(String(formData.get("lastPeriodMonth") ?? ""));
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!newLastPeriodMonth || !rentCents) {
    redirect(`/properties/${propertyId}/leases/${leaseId}/edit?error=Invalid%20lease%20details.`);
  }

  try {
    await updateLeaseRecord({
      propertyId,
      leaseId,
      lastPeriodMonth: newLastPeriodMonth,
      rentCents,
      notes,
    });
  } catch (error) {
    redirect(
      `/properties/${propertyId}/leases/${leaseId}/edit?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unable to update lease.",
      )}`,
    );
  }

  redirect(`/properties/${propertyId}`);
}
