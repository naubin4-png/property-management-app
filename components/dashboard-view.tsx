"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveDashboardNote } from "@/app/(dashboard)/dashboard/actions";
import type { DashboardProperty, DashboardStatus } from "@/lib/dashboard";

export type DashboardSummary = {
  collectedThisMonthCents: number;
  outstandingCents: number;
};

type DashboardViewProperty = DashboardProperty;

const statusLabels: Record<DashboardStatus, string> = {
  PAID: "Current",
  DUE: "Due",
  LATE: "Late",
  NO_LEASE: "No lease",
};

const statusStyles: Record<DashboardStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DUE: "bg-amber-50 text-amber-800 ring-amber-200",
  LATE: "bg-red-50 text-red-700 ring-red-200",
  NO_LEASE: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: Date | null) {
  if (!date) {
    return "No upcoming rent";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function StatusBadge({ status }: { status: DashboardStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function EmailActivity({ property }: { property: DashboardViewProperty }) {
  if (!property.latestEmail) {
    return null;
  }

  return (
    <span className="text-xs text-zinc-500">
      {property.latestEmail.label}{" "}
      {property.latestEmail.sentAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })}
    </span>
  );
}

function DashboardNote({
  property,
  onSaveNote,
}: {
  property: DashboardViewProperty;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
}) {
  const originalNote = property.dashboardNote ?? "";
  const [note, setNote] = useState(originalNote);
  const [savedNote, setSavedNote] = useState(originalNote);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!property.leaseId) {
    return <span className="text-sm text-zinc-400">No active lease</span>;
  }

  function saveNote() {
    const normalized = note.trim();
    if (normalized === savedNote) {
      return;
    }
    if (normalized.length > 500) {
      setError("Use 500 characters or fewer.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await (onSaveNote ?? saveDashboardNote)(property.leaseId!, normalized);
        setNote(normalized);
        setSavedNote(normalized);
      } catch {
        setError("Could not save this note.");
      }
    });
  }

  const errorId = `note-error-${property.id}`;

  return (
    <div>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-label={`Notes for ${property.name}`}
        className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
        disabled={isPending}
        maxLength={500}
        onBlur={saveNote}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          setNote(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        placeholder="Add note"
        value={note}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function MoneyBar({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-0">
        <div className="sm:border-r sm:border-zinc-200 sm:pr-6">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Collected this month
          </dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
            {formatCurrency(summary.collectedThisMonthCents)}
          </dd>
        </div>
        <div className="sm:pl-6">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Outstanding
          </dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
            {formatCurrency(summary.outstandingCents)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PropertyCard({
  attention,
  onOpen,
  onSaveNote,
  property,
}: {
  attention: boolean;
  onOpen?: () => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  property: DashboardViewProperty;
}) {
  return (
    <article
      aria-label={onOpen ? `Open ${property.name}` : undefined}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        onOpen
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          : ""
      } ${
        property.status === "LATE"
          ? "border-red-200"
          : property.status === "DUE"
            ? "border-amber-200"
            : "border-zinc-200"
      }`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen();
        }
      }}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-zinc-950">
            {property.name}
          </h3>
          <div className="mt-1">
            <EmailActivity property={property} />
          </div>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {attention ? "Amount due" : "Next due"}
        </p>
        <p
          className={`mt-1 font-semibold ${
            attention ? "text-lg text-zinc-950" : "text-sm text-zinc-700"
          }`}
        >
          {attention
            ? formatCurrency(property.amountOwedCents)
            : formatDate(property.nextDueDate)}
        </p>
      </div>

      <div
        className="mt-4 border-t border-zinc-100 pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Notes
        </p>
        <DashboardNote onSaveNote={onSaveNote} property={property} />
      </div>
    </article>
  );
}

function PropertySection({
  attention,
  onSaveNote,
  properties,
  propertyBaseHref,
  title,
}: {
  attention: boolean;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  properties: DashboardViewProperty[];
  propertyBaseHref: string | null;
  title: string;
}) {
  const router = useRouter();

  if (properties.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        <span className="text-sm text-zinc-500">{properties.length}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard
            attention={attention}
            key={property.id}
            onOpen={
              propertyBaseHref
                ? () => router.push(`${propertyBaseHref}/${property.id}`)
                : undefined
            }
            onSaveNote={onSaveNote}
            property={property}
          />
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
    <div className="space-y-7">
      <PropertySection
        attention
        onSaveNote={onSaveNote}
        properties={needsAttention}
        propertyBaseHref={propertyBaseHref}
        title="Needs Attention"
      />
      <PropertySection
        attention={false}
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
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
      <MoneyBar summary={summary} />

      {!hasProperties ? (
        <section className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Add your first space
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Add a space, tenant, and lease to start tracking rent.
          </p>
          {onAddProperty ? (
            <button
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={onAddProperty}
              type="button"
            >
              Add
            </button>
          ) : (
            <Link
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              href={emptyActionHref}
            >
              Add
            </Link>
          )}
        </section>
      ) : (
        <div className="mt-6">
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
