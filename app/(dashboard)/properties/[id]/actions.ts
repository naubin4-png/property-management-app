"use server";

import { revalidatePath } from "next/cache";

import { createLeaseRecord } from "@/lib/lease-creation";
import { parseDollarAmount, parseMonth } from "@/lib/lease-periods";
import {
  updateLeaseRecord,
  updatePropertyLeaseDetails,
} from "@/lib/lease-updates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { firstDayOfWorkspaceMonth } from "@/lib/workspace-time";

export type InlineEditState = {
  askCurrentMonthPayment?: boolean;
  error: string | null;
  propertyId?: string;
  saved: boolean;
};

export async function findTenantByEmail(email: string) {
  const { workspaceId } = await getWorkspaceContext();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return prisma.tenant.findFirst({
    where: {
      workspaceId,
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true },
  });
}

export async function createLeaseInline(
  propertyId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
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
  const reuseTenantId =
    String(formData.get("reuseTenantId") ?? "").trim() || undefined;

  if (
    !tenantName ||
    !firstPeriodMonth ||
    !rentCents
  ) {
    return { error: "Complete all required lease fields.", saved: false };
  }
  if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }
  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (lastPeriodMonth && lastPeriodMonth < firstPeriodMonth) {
    return {
      error: "Lease end must be the same as or after the first rent month.",
      saved: false,
    };
  }
  try {
    const { workspaceId, timezone } = await getWorkspaceContext();
    await createLeaseRecord({
      workspaceId,
      propertyId,
      tenantName,
      tenantEmail,
      firstPeriodMonth,
      lastPeriodMonth,
      rentCents,
      notes: null,
      reuseTenantId,
      timezone,
    });
    revalidatePath("/");
    revalidatePath(`/properties/${propertyId}`);
    const currentMonth = firstDayOfWorkspaceMonth(new Date(), timezone);
    return {
      askCurrentMonthPayment:
        firstPeriodMonth.getTime() === currentMonth.getTime(),
      error: null,
      propertyId,
      saved: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create lease.",
      saved: false,
    };
  }
}

export async function updateTenant(
  propertyId: string,
  tenantId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const name = String(formData.get("tenantName") ?? "").trim();
  const email =
    String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;

  if (!name) {
    return { error: "Tenant name is required.", saved: false };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }

  try {
    const { workspaceId } = await getWorkspaceContext();
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        workspaceId,
        leases: { some: { tenantId } },
      },
      select: { id: true },
    });
    if (!property) {
      throw new Error("Property not found.");
    }
    await prisma.tenant.update({
      where: { id: tenantId, workspaceId },
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
  const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
  const lastPeriodMonth = rawLastPeriodMonth
    ? parseMonth(rawLastPeriodMonth)
    : null;
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (!rentCents) {
    return { error: "Enter a valid monthly rent.", saved: false };
  }
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  try {
    const { workspaceId, timezone } = await getWorkspaceContext();
    await updateLeaseRecord({
      workspaceId,
      propertyId,
      leaseId,
      lastPeriodMonth,
      rentCents,
      notes,
      timezone,
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

export async function updatePropertyDetails(
  propertyId: string,
  leaseId: string,
  _state: InlineEditState,
  formData: FormData,
): Promise<InlineEditState> {
  const propertyName = String(formData.get("propertyName") ?? "").trim();
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantEmail =
    String(formData.get("tenantEmail") ?? "").trim().toLowerCase() || null;
  const rawLastPeriodMonth = String(formData.get("lastPeriodMonth") ?? "");
  const lastPeriodMonth = rawLastPeriodMonth
    ? parseMonth(rawLastPeriodMonth)
    : null;
  const rentCents = parseDollarAmount(String(formData.get("rent") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!propertyName || !tenantName) {
    return { error: "Property and tenant names are required.", saved: false };
  }
  if (!leaseId) {
    return { error: "Lease not found.", saved: false };
  }
  if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
    return { error: "Enter a valid tenant email.", saved: false };
  }
  if (rawLastPeriodMonth && !lastPeriodMonth) {
    return { error: "Choose a valid lease end month.", saved: false };
  }
  if (!rentCents) {
    return { error: "Enter a valid monthly rent.", saved: false };
  }
  if (notes.length > 1000) {
    return { error: "Use 1,000 characters or fewer for notes.", saved: false };
  }

  try {
    const { workspaceId, timezone } = await getWorkspaceContext();
    await updatePropertyLeaseDetails({
      workspaceId,
      propertyId,
      leaseId,
      lastPeriodMonth,
      propertyName,
      rentCents,
      tenantEmail,
      tenantName,
      notes,
      timezone,
    });
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/");
    return { error: null, saved: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to update details.",
      saved: false,
    };
  }
}
