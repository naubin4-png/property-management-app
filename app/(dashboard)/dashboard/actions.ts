"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function saveDashboardNote(leaseId: string, note: string) {
  await prisma.lease.update({
    where: { id: leaseId },
    data: { dashboardNote: note.trim() || null },
  });

  revalidatePath("/");
}
