"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveDashboardNote } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardProperty, DashboardStatus } from "@/lib/dashboard";

export type DashboardSummary = {
  collectedThisMonthCents: number;
  outstandingCents: number;
};

type DashboardViewProperty = DashboardProperty;

const statusLabels: Record<DashboardStatus, string> = {
  PAID: "Paid",
  DUE: "Due",
  LATE: "Late",
  NO_LEASE: "No Lease",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function propertyName(
  property: DashboardViewProperty,
  propertyBaseHref: string | null,
) {
  if (!propertyBaseHref) {
    return property.name;
  }

  return (
    <Link
      className="hover:underline"
      href={`${propertyBaseHref}/${property.id}`}
    >
      {property.name}
    </Link>
  );
}

function AttentionStatus({ property }: { property: DashboardViewProperty }) {
  const email = property.latestEmail
    ? ` · ${property.latestEmail.label} ${property.latestEmail.sentAt.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        },
      )}`
    : "";

  return (
    <p className="mt-1 text-xs font-normal text-zinc-500">
      {statusLabels[property.status]}
      {email}
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

export function MoneyBar({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        <span>
          <span className="font-medium text-zinc-500">
            Collected this month:
          </span>{" "}
          <span className="font-semibold text-zinc-950">
            {formatCurrency(summary.collectedThisMonthCents)}
          </span>
        </span>
        <span className="hidden px-3 text-zinc-300 sm:inline">|</span>
        <span>
          <span className="font-medium text-zinc-500">Outstanding:</span>{" "}
          <span className="font-semibold text-zinc-950">
            {formatCurrency(summary.outstandingCents)}
          </span>
        </span>
      </div>
    </section>
  );
}

function NeedsAttentionSection({
  properties,
  onSaveNote,
  propertyBaseHref,
}: {
  properties: DashboardViewProperty[];
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref: string | null;
}) {
  if (properties.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
        Needs Attention
      </h2>

      <div className="mt-3 hidden overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Property Name</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Amount Owed</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {properties.map((property) => (
              <tr className="hover:bg-zinc-50" key={property.id}>
                <td className="px-4 py-4 font-medium text-zinc-950">
                  {propertyName(property, propertyBaseHref)}
                  <AttentionStatus property={property} />
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {property.tenantName ?? "-"}
                </td>
                <td className="px-4 py-4 font-medium text-zinc-900">
                  {formatCurrency(property.amountOwedCents)}
                </td>
                <td className="w-2/5 px-4 py-4">
                  <DashboardNote onSaveNote={onSaveNote} property={property} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        {properties.map((property) => (
          <div
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            key={property.id}
          >
            <p className="font-medium text-zinc-950">
              {propertyName(property, propertyBaseHref)}
            </p>
            <AttentionStatus property={property} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Tenant</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {property.tenantName ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Amount owed</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {formatCurrency(property.amountOwedCents)}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Notes
              </p>
              <DashboardNote onSaveNote={onSaveNote} property={property} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AllGoodSection({
  properties,
  onSaveNote,
  propertyBaseHref,
}: {
  properties: DashboardViewProperty[];
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref: string | null;
}) {
  if (properties.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
        All Good
      </h2>

      <div className="mt-3 hidden overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Property Name</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {properties.map((property) => (
              <tr className="hover:bg-zinc-50" key={property.id}>
                <td className="w-1/2 px-4 py-4 font-medium text-zinc-950">
                  {propertyName(property, propertyBaseHref)}
                </td>
                <td className="px-4 py-4">
                  <DashboardNote onSaveNote={onSaveNote} property={property} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        {properties.map((property) => (
          <div
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            key={property.id}
          >
            <p className="font-medium text-zinc-950">
              {propertyName(property, propertyBaseHref)}
            </p>
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Notes
              </p>
              <DashboardNote onSaveNote={onSaveNote} property={property} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PropertyTable({
  needsAttention,
  allGood,
  onSaveNote,
  propertyBaseHref = "/properties",
}: {
  needsAttention: DashboardViewProperty[];
  allGood: DashboardViewProperty[];
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref?: string | null;
}) {
  return (
    <div className="space-y-8">
      <NeedsAttentionSection
        onSaveNote={onSaveNote}
        properties={needsAttention}
        propertyBaseHref={propertyBaseHref}
      />
      <AllGoodSection
        onSaveNote={onSaveNote}
        properties={allGood}
        propertyBaseHref={propertyBaseHref}
      />
    </div>
  );
}

export function DashboardView({
  allGood,
  emptyActionHref = "/?addProperty=1",
  needsAttention,
  onAddProperty,
  onSaveNote,
  propertyBaseHref = "/properties",
  summary,
}: {
  allGood: DashboardViewProperty[];
  emptyActionHref?: string;
  needsAttention: DashboardViewProperty[];
  onAddProperty?: () => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  propertyBaseHref?: string | null;
  summary: DashboardSummary;
}) {
  const hasProperties = needsAttention.length > 0 || allGood.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <MoneyBar summary={summary} />

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
            onSaveNote={onSaveNote}
            propertyBaseHref={propertyBaseHref}
          />
        </div>
      )}
    </main>
  );
}
