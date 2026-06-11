"use server";

import { revalidatePath } from "next/cache";

import { parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import { updateLeaseRecord } from "@/lib/lease-updates";
import { prisma } from "@/lib/prisma";

export type InlineEditState = {
  error: string | null;
  saved: boolean;
};

export async function updateTenant(
  propertyId: string,
  tenantId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const name = String(formData.get("tenantName") ?? "").trim();
  const email = String(formData.get("tenantEmail") ?? "").trim().toLowerCase();

  if (!name) {
    return { error: "Tenant name is required.", saved: false };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { name, email },
    });
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/");
    return { error: null, saved: true };
  } catch {
    return { error: "Unable to update tenant.", saved: false };
  }
}

export async function updateLeaseInline(
  propertyId: string,
  leaseId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const lastPeriodMonth = parseMonth(
    String(formData.get("lastPeriodMonth") ?? ""),
  );
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (!rentCents) {
    return { error: "Enter a valid monthly rent.", saved: false };
  }
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  try {
    await updateLeaseRecord({
      propertyId,
      leaseId,
      lastPeriodMonth,
      rentCents,
      notes,
    });
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/");
    return { error: null, saved: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update lease.",
      saved: false,
    };
  }
}
