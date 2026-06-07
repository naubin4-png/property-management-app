"use client";

import { ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";

import type { DashboardProperty, DashboardStatus } from "@/lib/dashboard";
import { formatMoney, formatMonth } from "@/lib/lease-math";
import { cn } from "@/lib/utils";

const statusStyles: Record<DashboardStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DUE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  LATE: "bg-red-50 text-red-700 ring-red-600/20",
  NO_LEASE: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

const statusLabels: Record<DashboardStatus, string> = {
  PAID: "Paid",
  DUE: "Due",
  LATE: "Late",
  NO_LEASE: "No Lease",
};

function StatusChip({ status }: { status: DashboardStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function PaymentAction({ property }: { property: DashboardProperty }) {
  if (!property.hasActiveLease) {
    return <span className="text-zinc-400">-</span>;
  }

  return (
    <button
      aria-label={`Log payment for ${property.name}`}
      className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      onClick={(event) => event.stopPropagation()}
      type="button"
    >
      <ReceiptText aria-hidden="true" size={18} />
    </button>
  );
}

export function PropertyList({
  title,
  properties,
}: {
  title: string;
  properties: DashboardProperty[];
}) {
  const router = useRouter();

  if (properties.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>

      <div className="mt-3 hidden overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Property Name</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Monthly Rent</th>
              <th className="px-4 py-3 font-medium">Next Due Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {properties.map((property) => (
              <tr
                className="cursor-pointer hover:bg-zinc-50"
                key={property.id}
                onClick={() => router.push(`/properties/${property.id}`)}
              >
                <td className="px-4 py-4 font-medium text-zinc-950">{property.name}</td>
                <td className="px-4 py-4 text-zinc-600">{property.tenantName ?? "-"}</td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.rentCents === null
                    ? "-"
                    : `$${formatMoney(property.rentCents)}`}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.nextDueDate ? formatMonth(property.nextDueDate) : "-"}
                </td>
                <td className="px-4 py-4">
                  <StatusChip status={property.status} />
                </td>
                <td className="px-4 py-4 text-right">
                  <PaymentAction property={property} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        {properties.map((property) => (
          <button
            className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm"
            key={property.id}
            onClick={() => router.push(`/properties/${property.id}`)}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-zinc-950">{property.name}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {property.tenantName ?? "No tenant"}
                </p>
              </div>
              <StatusChip status={property.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Monthly rent</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {property.rentCents === null
                    ? "-"
                    : `$${formatMoney(property.rentCents)}`}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Next due</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {property.nextDueDate ? formatMonth(property.nextDueDate) : "-"}
                </dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </section>
  );
}
