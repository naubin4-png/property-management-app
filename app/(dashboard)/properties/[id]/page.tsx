import { randomUUID } from "node:crypto";

import { PeriodStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentModal } from "@/components/payment-modal";
import { RecentPayments } from "@/components/recent-payments";
import { firstDayOfCurrentMonth, formatMoney, formatMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";

import { updateTenant } from "./actions";
import { editPayment, logPayment } from "../../payments/actions";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ logPayment?: string; editPayment?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const currentMonth = firstDayOfCurrentMonth();
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      leases: {
        orderBy: { firstPeriodMonth: "desc" },
        include: {
          tenant: true,
          paymentPeriods: {
            orderBy: { periodMonth: "asc" },
          },
          payments: {
            orderBy: { receivedAt: "desc" },
          },
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const activeLease =
    property.leases.find((lease) => lease.lastPeriodMonth >= currentMonth) ?? null;
  const payments = property.leases
    .flatMap((lease) => lease.payments)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  const nextDuePeriod = activeLease?.paymentPeriods.find(
    (period) =>
      period.status === PeriodStatus.PENDING ||
      period.status === PeriodStatus.LATE,
  );
  const totalPaidCents =
    activeLease?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0;
  const totalAllocatedCents =
    activeLease?.paymentPeriods
      .filter((period) => period.status === PeriodStatus.RECEIVED)
      .reduce((sum, period) => sum + period.amountDueCents, 0) ?? 0;
  const creditBalanceCents = totalPaidCents - totalAllocatedCents;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link className="text-sm font-medium text-zinc-600 hover:text-zinc-950" href="/">
        Back to dashboard
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          {property.name}
        </h1>
        {property.notes ? (
          <p className="mt-2 whitespace-pre-wrap text-zinc-600">{property.notes}</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No property notes.</p>
        )}
      </header>

      {activeLease ? (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-zinc-500">Active Lease</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                {activeLease.tenant.name}
              </h2>
              <a
                className="mt-1 inline-block text-sm text-zinc-600 hover:text-zinc-950"
                href={`mailto:${activeLease.tenant.email}`}
              >
                {activeLease.tenant.email}
              </a>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  Edit tenant info
                </summary>
                <form
                  action={updateTenant.bind(null, property.id, activeLease.tenant.id)}
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                >
                  <input
                    className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                    defaultValue={activeLease.tenant.name}
                    name="tenantName"
                    required
                  />
                  <input
                    className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                    defaultValue={activeLease.tenant.email}
                    name="tenantEmail"
                    required
                    type="email"
                  />
                  <button
                    className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium sm:col-span-2 sm:justify-self-start"
                    type="submit"
                  >
                    Save Tenant
                  </button>
                </form>
              </details>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                href={`/properties/${property.id}?logPayment=1`}
              >
                Log Payment
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                href={`/properties/${property.id}/leases/${activeLease.id}/edit`}
              >
                Edit Lease
              </Link>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-zinc-200 pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-zinc-500">Monthly rent</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                ${formatMoney(activeLease.rentCents)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">First rent due</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {formatMonth(activeLease.firstPeriodMonth)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Lease ends</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {formatMonth(activeLease.lastPeriodMonth)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 rounded-lg bg-zinc-950 px-5 py-4 text-white">
            <p className="text-sm text-zinc-300">Next Payment Due</p>
            <p className="mt-1 text-lg font-semibold">
              {nextDuePeriod
                ? `${formatMonth(nextDuePeriod.periodMonth)} - $${formatMoney(
                    nextDuePeriod.amountDueCents,
                  )}`
                : "No payment currently due"}
            </p>
          </div>

          {creditBalanceCents > 0 ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
              <p className="text-sm text-emerald-700">Credit Balance</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900">
                ${formatMoney(creditBalanceCents)}
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            No Active Lease
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Add the tenant, rent amount, and lease dates to start tracking payments.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            href={`/properties/${property.id}/leases/new`}
          >
            Add Lease
          </Link>
        </section>
      )}

      <RecentPayments payments={payments} propertyId={property.id} />

      {query.logPayment === "1" && activeLease ? (
        <PaymentModal
          action={logPayment}
          clientRequestId={randomUUID()}
          closeHref={`/properties/${property.id}`}
          properties={[
            {
              id: property.id,
              name: property.name,
              rentCents: activeLease.rentCents,
              creditBalanceCents,
              nextDueDate: nextDuePeriod?.periodMonth ?? null,
            },
          ]}
          selectedPropertyId={property.id}
        />
      ) : null}

      {query.editPayment ? (
        <EditPaymentModal
          paymentId={query.editPayment}
          propertyId={property.id}
          propertyName={property.name}
        />
      ) : null}
    </main>
  );
}

async function EditPaymentModal({
  paymentId,
  propertyId,
  propertyName,
}: {
  paymentId: string;
  propertyId: string;
  propertyName: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      lease: { propertyId },
    },
  });

  if (!payment) {
    return null;
  }

  return (
    <PaymentModal
      action={editPayment.bind(null, payment.id)}
      clientRequestId={payment.clientRequestId}
      closeHref={`/properties/${propertyId}`}
      payment={payment}
      properties={[{ id: propertyId, name: propertyName }]}
      selectedPropertyId={propertyId}
    />
  );
}
