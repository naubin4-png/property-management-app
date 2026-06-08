"use client";

import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { saveDashboardNote } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardProperty, DashboardStatus } from "@/lib/dashboard";
import { formatMoney, formatMonth } from "@/lib/lease-math";
import { cn } from "@/lib/utils";

export type DashboardSummary = {
  activeProperties: number;
  paymentsThisMonth: number;
  needingAttention: number;
};

type DashboardViewProperty = DashboardProperty;

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

function RecentEmail({ property }: { property: DashboardViewProperty }) {
  if (!property.latestEmail) {
    return null;
  }

  return (
    <p className="mt-1 text-xs text-zinc-500">
      {property.latestEmail.label}{" "}
      {property.latestEmail.sentAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })}
    </p>
  );
}

function DashboardNote({
  property,
  onSaveNote,
}: {
  property: DashboardViewProperty;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
}) {
  const [note, setNote] = useState(property.dashboardNote ?? "");
  const [isPending, startTransition] = useTransition();

  if (!property.leaseId) {
    return <span className="text-zinc-400">-</span>;
  }

  return (
    <input
      aria-label={`Notes for ${property.name}`}
      className="h-9 w-full min-w-40 rounded-md border border-transparent bg-transparent px-2 text-sm text-zinc-700 outline-none hover:border-zinc-200 hover:bg-white focus:border-zinc-300 focus:bg-white disabled:opacity-60"
      disabled={isPending}
      onBlur={(event) => {
        const nextNote = event.currentTarget.value;
        if (nextNote === (property.dashboardNote ?? "")) {
          return;
        }
        startTransition(() => {
          void (onSaveNote ?? saveDashboardNote)(property.leaseId!, nextNote);
        });
      }}
      onChange={(event) => setNote(event.target.value)}
      placeholder="Add note"
      value={note}
    />
  );
}

export function StatCards({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-0">
        <span>
          <span className="font-medium text-zinc-500">Active properties:</span>{" "}
          <span className="font-semibold text-zinc-950">
            {summary.activeProperties}
          </span>
        </span>
        <span className="hidden px-3 text-zinc-300 sm:inline">|</span>
        <span>
          <span className="font-medium text-zinc-500">Payments this month:</span>{" "}
          <span className="font-semibold text-zinc-950">
            {summary.paymentsThisMonth}
          </span>
        </span>
        <span className="hidden px-3 text-zinc-300 sm:inline">|</span>
        <span>
          <span className="font-medium text-zinc-500">Needing attention:</span>{" "}
          <span className="font-semibold text-zinc-950">
            {summary.needingAttention}
          </span>
        </span>
      </div>
    </section>
  );
}

function PaymentAction({
  property,
  onLogPayment,
}: {
  property: DashboardViewProperty;
  onLogPayment?: (propertyId?: string) => void;
}) {
  if (!property.hasActiveLease) {
    return null;
  }

  if (onLogPayment) {
    return (
      <button
        aria-label={`Log payment for ${property.name}`}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 md:mt-0 md:border-0 md:p-2 md:text-zinc-500 md:hover:bg-zinc-100 md:hover:text-zinc-900"
        onClick={() => onLogPayment(property.id)}
        type="button"
      >
        <ReceiptText aria-hidden="true" size={18} />
        <span className="md:hidden">Log Payment</span>
      </button>
    );
  }

  return (
    <Link
      aria-label={`Log payment for ${property.name}`}
      className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 md:mt-0 md:border-0 md:p-2 md:text-zinc-500 md:hover:bg-zinc-100 md:hover:text-zinc-900"
      href={`/?logPayment=1&propertyId=${property.id}`}
      onClick={(event) => event.stopPropagation()}
    >
      <ReceiptText aria-hidden="true" size={18} />
      <span className="md:hidden">Log Payment</span>
    </Link>
  );
}

function PropertySection({
  properties,
  title,
  onLogPayment,
  onSaveNote,
  propertyBaseHref,
}: {
  properties: DashboardViewProperty[];
  title: string;
  onLogPayment?: (propertyId?: string) => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref: string | null;
}) {
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
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {properties.map((property) => (
              <tr className="hover:bg-zinc-50" key={property.id}>
                <td className="px-4 py-4 font-medium text-zinc-950">
                  {propertyBaseHref ? (
                    <Link
                      className="hover:underline"
                      href={`${propertyBaseHref}/${property.id}`}
                    >
                      {property.name}
                    </Link>
                  ) : (
                    property.name
                  )}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.tenantName ?? "-"}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.rentCents === null
                    ? "-"
                    : `$${formatMoney(property.rentCents)}`}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.nextDueDate ? formatMonth(property.nextDueDate) : "-"}
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusChip status={property.status} />
                  <RecentEmail property={property} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <DashboardNote
                      onSaveNote={onSaveNote}
                      property={property}
                    />
                    <PaymentAction
                      onLogPayment={onLogPayment}
                      property={property}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        {properties.map((property) => (
          <div
            className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm"
            key={property.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-zinc-950">
                  {propertyBaseHref ? (
                    <Link
                      className="hover:underline"
                      href={`${propertyBaseHref}/${property.id}`}
                    >
                      {property.name}
                    </Link>
                  ) : (
                    property.name
                  )}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {property.tenantName ?? "No tenant"}
                </p>
              </div>
              <div className="text-right">
                <StatusChip status={property.status} />
                <RecentEmail property={property} />
              </div>
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
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Notes
              </p>
              <DashboardNote onSaveNote={onSaveNote} property={property} />
            </div>
            <PaymentAction onLogPayment={onLogPayment} property={property} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PropertyTable({
  needsAttention,
  allGood,
  onLogPayment,
  onSaveNote,
  propertyBaseHref = "/properties",
}: {
  needsAttention: DashboardViewProperty[];
  allGood: DashboardViewProperty[];
  onLogPayment?: (propertyId?: string) => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref?: string | null;
}) {
  return (
    <div className="space-y-8">
      <PropertySection
        onLogPayment={onLogPayment}
        onSaveNote={onSaveNote}
        properties={needsAttention}
        propertyBaseHref={propertyBaseHref}
        title="Needs Attention"
      />
      <PropertySection
        onLogPayment={onLogPayment}
        onSaveNote={onSaveNote}
        properties={allGood}
        propertyBaseHref={propertyBaseHref}
        title="All Good"
      />
    </div>
  );
}

export function DashboardView({
  allGood,
  emptyActionHref = "/?addProperty=1",
  needsAttention,
  onAddProperty,
  onLogPayment,
  onSaveNote,
  propertyBaseHref = "/properties",
  summary,
}: {
  allGood: DashboardViewProperty[];
  emptyActionHref?: string;
  needsAttention: DashboardViewProperty[];
  onAddProperty?: () => void;
  onLogPayment?: (propertyId?: string) => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref?: string | null;
  summary: DashboardSummary;
}) {
  const hasProperties = needsAttention.length > 0 || allGood.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <StatCards summary={summary} />

      {!hasProperties ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Add your first property
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Start by adding a property, then attach its tenant and lease details.
          </p>
          {onAddProperty ? (
            <button
              className="mt-6 inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={onAddProperty}
              type="button"
            >
              Add Your First Property
            </button>
          ) : (
            <Link
              className="mt-6 inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              href={emptyActionHref}
            >
              Add Your First Property
            </Link>
          )}
        </section>
      ) : (
        <div className="mt-8">
          <PropertyTable
            allGood={allGood}
            needsAttention={needsAttention}
            onLogPayment={onLogPayment}
            onSaveNote={onSaveNote}
            propertyBaseHref={propertyBaseHref}
          />
        </div>
      )}
    </main>
  );
}
