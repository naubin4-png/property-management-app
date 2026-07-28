import { randomUUID } from "node:crypto";

import Link from "next/link";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { EditPaymentModal } from "@/components/edit-payment-modal";
import { NewLeaseModal } from "@/components/new-lease-modal";
import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import { getDashboardData } from "@/lib/dashboard";
import { getPropertyDetails } from "@/lib/property-details";

import { logPayment } from "./payments/actions";
import { createPropertyWithLease } from "./properties/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    addProperty?: string;
    addCheck?: string;
    editPayment?: string;
    logPayment?: string;
    newLease?: string;
    property?: string;
    propertyId?: string;
    leaseAdded?: string;
  }>;
}) {
  const query = await searchParams;
  const { properties, needsAttention, allGood, summary } = await getDashboardData();
  const selectedProperty = query.property
    ? await getPropertyDetails(query.property)
    : null;
  const selectedLeaseCoversBillingMonth =
    selectedProperty?.activeLease &&
    selectedProperty.activeLease.firstPeriodMonth <= summary.billingPeriodMonth &&
    (!selectedProperty.activeLease.lastPeriodMonth ||
      selectedProperty.activeLease.lastPeriodMonth >= summary.billingPeriodMonth);
  const paymentProperties = properties
    .filter((property) => property.hasActiveLease)
    .map((property) => ({
      id: property.id,
      name: property.name,
      rentCents: property.rentCents,
      creditBalanceCents: property.creditBalanceCents,
      nextDueDate: property.nextDueDate,
    }));

  return (
    <>
      <DashboardView
        allGood={allGood}
        needsAttention={needsAttention}
        propertyBaseHref="/?property="
        summary={summary}
      />
      {query.leaseAdded === "1" && query.propertyId ? (
        <section className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              Lease added. Has{" "}
              {summary.billingPeriodMonth.toLocaleDateString("en-US", {
                month: "long",
                timeZone: "UTC",
              })}{" "}
              rent already been paid?
            </p>
            <div className="flex gap-2">
              <Link
                className="inline-flex h-11 items-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-950"
                href={`/?property=${query.propertyId}`}
              >
                Not yet
              </Link>
              <Link
                className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
                href={`/?property=${query.propertyId}&addCheck=1&propertyId=${query.propertyId}`}
              >
                Record payment
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      {selectedProperty ? (
        <PropertyPanel closeHref="/" title={selectedProperty.name}>
          <PropertyDetailContent
            detail={selectedProperty}
            logPaymentHref={
              selectedLeaseCoversBillingMonth
                ? `/?property=${selectedProperty.id}&addCheck=1&propertyId=${selectedProperty.id}`
                : undefined
            }
            newLeaseHref={`/?property=${selectedProperty.id}&newLease=1`}
            paymentReturnHref={`/?property=${selectedProperty.id}`}
            remindersHref={`/email?property=${selectedProperty.id}`}
          />
        </PropertyPanel>
      ) : null}
      {query.addCheck === "1" || query.logPayment === "1" ? (
        <AddCheckModal
          action={logPayment}
          clientRequestId={randomUUID()}
          closeHref={query.property ? `/?property=${query.property}` : "/"}
          properties={paymentProperties}
          selectedPropertyId={query.propertyId}
        />
      ) : null}
      {query.editPayment && selectedProperty ? (
        <EditPaymentModal
          paymentId={query.editPayment}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          returnHref={`/?property=${selectedProperty.id}`}
        />
      ) : null}
      {query.newLease === "1" &&
      selectedProperty &&
      !selectedProperty.activeLease ? (
        <NewLeaseModal
          closeHref={`/?property=${selectedProperty.id}`}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
        />
      ) : null}
      {query.addProperty === "1" ? (
        <AddPropertyModal action={createPropertyWithLease} closeHref="/" />
      ) : null}
    </>
  );
}
