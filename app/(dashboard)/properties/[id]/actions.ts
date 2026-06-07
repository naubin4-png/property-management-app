"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function updateTenant(propertyId: string, tenantId: string, formData: FormData) {
  const name = String(formData.get("tenantName") ?? "").trim();
  const email = String(formData.get("tenantEmail") ?? "").trim().toLowerCase();

  if (!name || !email) {
    return;
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name, email },
  });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/");
}
