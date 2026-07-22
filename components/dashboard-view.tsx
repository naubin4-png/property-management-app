"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardProperty, DashboardStatus } from "@/lib/dashboard";

export type DashboardSummary = {
  billingPeriodMonth: Date;
  collectedThisMonthCents: number;
  outstandingCents: number;
};

type DashboardViewProperty = DashboardProperty;

const statusLabels: Record<DashboardStatus, string> = {
  PAID: "Paid",
  DUE: "Unpaid",
  LATE: "Unpaid",
  NO_LEASE: "No lease",
};

const statusStyles: Record<DashboardStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DUE: "bg-amber-50 text-amber-800 ring-amber-200",
  LATE: "bg-amber-50 text-amber-800 ring-amber-200",
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

function formatMonthHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthName(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

function primaryLine(property: DashboardViewProperty) {
  if (!property.hasActiveLease || !property.billingPeriodMonth) {
    return "No active lease";
  }

  if (property.billingPeriodRemainingCents > 0) {
    if (
      property.rentCents &&
      property.billingPeriodRemainingCents < property.rentCents
    ) {
      return `${formatCurrency(property.billingPeriodRemainingCents)} remaining`;
    }

    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    return property.billingPeriodMonth > now
      ? `Due ${formatShortDate(property.billingPeriodMonth)}`
      : `Unpaid since ${formatShortDate(property.billingPeriodMonth)}`;
  }

  if (property.advancePayment) {
    return `Paid through ${formatMonthName(property.advancePayment.paidThrough)}`;
  }

  if (property.billingPeriodPaidAt) {
    return `Paid ${formatShortDate(property.billingPeriodPaidAt)}`;
  }

  return "Paid";
}

function secondaryLine(property: DashboardViewProperty) {
  if (
    property.advancePayment &&
    property.nextDueDate &&
    property.billingPeriodRemainingCents === 0
  ) {
    return `Next due ${formatShortDate(property.nextDueDate)}`;
  }

  if (
    property.billingPeriodRemainingCents > 0 &&
    property.rentCents &&
    property.billingPeriodMonth &&
    property.billingPeriodRemainingCents < property.rentCents
  ) {
    const statusLine =
      property.billingPeriodMonth > new Date()
        ? `Due ${formatShortDate(property.billingPeriodMonth)}`
        : `Unpaid since ${formatShortDate(property.billingPeriodMonth)}`;
    const emailLine = property.latestEmail
      ? `${property.latestEmail.label} ${formatShortDate(property.latestEmail.sentAt)}`
      : null;

    return [statusLine, emailLine].filter(Boolean).join(" · ");
  }

  if (property.billingPeriodRemainingCents > 0 && property.latestEmail) {
    return `${property.latestEmail.label} ${formatShortDate(property.latestEmail.sentAt)}`;
  }

  return null;
}

export function MoneyBar({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
        {formatMonthHeading(summary.billingPeriodMonth)}
      </h1>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-0">
        <div className="sm:border-r sm:border-zinc-200 sm:pr-6">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Collected
          </dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
            {formatCurrency(summary.collectedThisMonthCents)}
          </dd>
        </div>
        <div className="sm:pl-6">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Still due
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
  onOpen,
  property,
}: {
  onOpen?: () => void;
  property: DashboardViewProperty;
}) {
  const supportingLine = secondaryLine(property);
  const note = property.dashboardNote?.trim();

  return (
    <article
      aria-label={onOpen ? `Open ${property.name}` : undefined}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        onOpen
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          : ""
      } ${
        property.billingPeriodRemainingCents > 0
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
          <p className="mt-2 text-sm font-medium text-zinc-800">
            {primaryLine(property)}
          </p>
          {supportingLine ? (
            <p className="mt-1 text-xs text-zinc-500">{supportingLine}</p>
          ) : null}
          {note ? (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
              {note}
            </p>
          ) : null}
        </div>
        <StatusBadge status={property.status} />
      </div>
    </article>
  );
}

function PropertySection({
  onOpenProperty,
  properties,
  propertyBaseHref,
  title,
}: {
  onOpenProperty?: (propertyId: string) => void;
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
            key={property.id}
            onOpen={
              onOpenProperty
                ? () => onOpenProperty(property.id)
                : propertyBaseHref
                  ? () =>
                      router.push(
                        propertyBaseHref.includes("?")
                          ? `${propertyBaseHref}${property.id}`
                          : `${propertyBaseHref}/${property.id}`,
                      )
                  : undefined
            }
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
  onOpenProperty,
  propertyBaseHref = "/properties",
}: {
  needsAttention: DashboardViewProperty[];
  allGood: DashboardViewProperty[];
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  onOpenProperty?: (propertyId: string) => void;
  propertyBaseHref?: string | null;
}) {
  return (
    <div className="space-y-7">
      <PropertySection
        onOpenProperty={onOpenProperty}
        properties={needsAttention}
        propertyBaseHref={propertyBaseHref}
        title="Unpaid"
      />
      <PropertySection
        onOpenProperty={onOpenProperty}
        properties={allGood}
        propertyBaseHref={propertyBaseHref}
        title="Paid"
      />
    </div>
  );
}

export function DashboardView({
  allGood,
  emptyActionHref = "/?addProperty=1",
  needsAttention,
  onAddProperty,
  onOpenProperty,
  propertyBaseHref = "/properties",
  summary,
}: {
  allGood: DashboardViewProperty[];
  emptyActionHref?: string;
  needsAttention: DashboardViewProperty[];
  onAddProperty?: () => void;
  onSaveNote?: (leaseId: string, note: string) => Promise<void> | void;
  onOpenProperty?: (propertyId: string) => void;
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
            Add your first lease
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
              Add lease
            </button>
          ) : (
            <Link
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              href={emptyActionHref}
            >
              Add lease
            </Link>
          )}
        </section>
      ) : (
        <div className="mt-6">
          <PropertyTable
            allGood={allGood}
            needsAttention={needsAttention}
            onOpenProperty={onOpenProperty}
            propertyBaseHref={propertyBaseHref}
          />
        </div>
      )}
    </main>
  );
}
