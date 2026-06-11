import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney, formatMonth } from "@/lib/lease-math";
import { monthInputValue } from "@/lib/lease-periods";
import { prisma } from "@/lib/prisma";

import { updateLease } from "./actions";

export default async function EditLeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; leaseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, leaseId } = await params;
  const { error } = await searchParams;
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, propertyId: id },
    include: { property: true, tenant: true },
  });

  if (!lease) {
    notFound();
  }

  const action = updateLease.bind(null, id, leaseId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
        href={`/properties/${id}`}
      >
        Back to property
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
        Edit Lease
      </h1>
      <p className="mt-2 text-zinc-600">{lease.property.name}</p>

      <form
        action={action}
        className="mt-8 space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-zinc-500">Tenant</p>
            <p className="mt-1 font-medium text-zinc-950">{lease.tenant.name}</p>
          </div>
          <div>
            <p className="text-zinc-500">First rent due</p>
            <p className="mt-1 font-medium text-zinc-950">
              {formatMonth(lease.firstPeriodMonth)}
            </p>
          </div>
        </div>
        <label className="block text-sm font-medium text-zinc-800">
          Extend Lease Through
          <input
            autoFocus
            className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
            defaultValue={monthInputValue(lease.lastPeriodMonth)}
            min={monthInputValue(lease.lastPeriodMonth)}
            name="lastPeriodMonth"
            required
            type="month"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Monthly Rent
          <input
            className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
            defaultValue={formatMoney(lease.rentCents)}
            inputMode="decimal"
            min="0.01"
            name="rent"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Notes <span className="font-normal text-zinc-500">(optional)</span>
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none focus:border-zinc-900"
            defaultValue={lease.notes ?? ""}
            name="notes"
          />
        </label>
        <div className="flex justify-end">
          <button
            className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Save Lease
          </button>
        </div>
      </form>
    </main>
  );
}
