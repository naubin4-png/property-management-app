import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaseForm } from "@/components/lease-form";
import { prisma } from "@/lib/prisma";

import { createLease } from "./actions";

export default async function NewLeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const property = await prisma.property.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!property) {
    notFound();
  }

  const action = createLease.bind(null, id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
        href={`/properties/${id}`}
      >
        Back to property
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
        Add Lease
      </h1>
      <p className="mt-2 text-zinc-600">{property.name}</p>
      <LeaseForm action={action} error={error} />
    </main>
  );
}
