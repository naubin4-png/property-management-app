"use client";

import Link from "next/link";

import {
  LeaseInlineEditor,
  TenantInlineEditor,
} from "@/components/property-inline-editors";
import { RecentPayments } from "@/components/recent-payments";
import { formatMoney, formatMonth } from "@/lib/lease-math";
import type {
  PropertyDetailData,
  PropertyPeriodStatus,
} from "@/lib/property-details";

const periodLabels: Record<PropertyPeriodStatus, string> = {
  RECEIVED: "Paid",
  DUE: "Due",
  LATE: "Late",
  UPCOMING: "Upcoming",
};

const periodStyles: Record<PropertyPeriodStatus, string> = {
  RECEIVED: "bg-emerald-50 text-emerald-700",
  DUE: "bg-amber-50 text-amber-800",
  LATE: "bg-red-50 text-red-700",
  UPCOMING: "bg-zinc-100 text-zinc-600",
};

export function PropertyDetailContent({
  detail,
  logPaymentHref,
  newLeaseHref,
  onLogPayment,
  paymentReturnHref,
  showPaymentActions = true,
  showInlineEditing = true,
}: {
  detail: PropertyDetailData;
  logPaymentHref?: string;
  newLeaseHref?: string;
  onLogPayment?: () => void;
  paymentReturnHref?: string;
  showPaymentActions?: boolean;
  showInlineEditing?: boolean;
}) {
  const lease = detail.activeLease;

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {detail.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {detail.notes || "No space notes"}
          </p>
        </div>
        {lease && onLogPayment ? (
          <button
            className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={onLogPayment}
            type="button"
          >
            Add Check
          </button>
        ) : lease && logPaymentHref ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            href={logPaymentHref}
          >
            Add Check
          </Link>
        ) : null}
      </div>

      {lease ? (
        <>
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Tenant
                </p>
                <p className="mt-1 font-semibold text-zinc-950">
                  {lease.tenant.name}
                </p>
                <a
                  className="mt-0.5 inline-flex min-h-11 items-center text-sm text-zinc-600 hover:text-zinc-950"
                  href={`mailto:${lease.tenant.email}`}
                >
                  {lease.tenant.email}
                </a>
                {showInlineEditing ? (
                  <TenantInlineEditor
                    propertyId={detail.id}
                    tenant={lease.tenant}
                  />
                ) : null}
              </div>
              {lease.creditBalanceCents > 0 ? (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                  <p className="text-xs text-emerald-700">Credit</p>
                  <p className="font-semibold text-emerald-900">
                    ${formatMoney(lease.creditBalanceCents)}
                  </p>
                </div>
              ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-zinc-500">Monthly rent</dt>
                <dd className="mt-0.5 font-semibold text-zinc-950">
                  ${formatMoney(lease.rentCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">First due</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-800">
                  {formatMonth(lease.firstPeriodMonth)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Lease ends</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-800">
                  {formatMonth(lease.lastPeriodMonth)}
                </dd>
              </div>
            </dl>
            {lease.dashboardNote || lease.notes ? (
              <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                {lease.dashboardNote || lease.notes}
              </p>
            ) : null}
          </section>

          <RecentPayments
            compact
            payments={detail.payments}
            propertyId={detail.id}
            returnHref={paymentReturnHref}
            showActions={showPaymentActions}
          />

          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold text-zinc-950">
                Rent periods
              </h2>
            </div>
            {showInlineEditing ? (
              <LeaseInlineEditor lease={lease} propertyId={detail.id} />
            ) : null}
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {lease.periods.map((period) => (
                <div
                  className="flex items-center justify-between gap-4 px-4 py-3"
                  key={period.id}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatMonth(period.periodMonth)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      ${formatMoney(period.amountDueCents)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${periodStyles[period.status]}`}
                  >
                    {periodLabels[period.status]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
          <h2 className="font-semibold text-zinc-950">No active lease</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Add a tenant, rent amount, and lease dates to track payments.
          </p>
          {newLeaseHref ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
              href={newLeaseHref}
            >
              New Lease
            </Link>
          ) : null}
        </section>
      )}
    </div>
  );
}
