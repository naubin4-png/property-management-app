"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function saveDashboardNote(leaseId: string, note: string) {
  const normalizedNote = note.trim();

  if (!leaseId) {
    throw new Error("A lease is required to save a note.");
  }

  if (normalizedNote.length > 500) {
    throw new Error("Notes must be 500 characters or fewer.");
  }

  await prisma.lease.update({
    where: { id: leaseId },
    data: { dashboardNote: normalizedNote || null },
  });

  revalidatePath("/");
}
