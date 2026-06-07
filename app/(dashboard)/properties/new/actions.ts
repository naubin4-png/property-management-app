"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function createProperty(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    redirect("/properties/new?error=Property%20name%20is%20required.");
  }

  const property = await prisma.property.create({
    data: {
      name,
      notes: notes || null,
    },
  });

  redirect(`/properties/${property.id}`);
}
