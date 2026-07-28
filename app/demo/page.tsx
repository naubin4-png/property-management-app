import { randomUUID } from "node:crypto";

import Link from "next/link";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import {
  getDemoDashboardData,
  getDemoCreatedLease,
  getDemoNoteSimulation,
  getDemoPaymentSimulation,
  getDemoPropertyDetails,
} from "@/lib/demo-data";

import {
  createDemoPropertyWithLease,
  deleteDemoPayment,
  editDemoPayment,
  logDemoPayment,
  updateDemoLeaseInline,
  updateDemoTenant,
} from "./actions";

export const metadata = {
  title: "Property Manager Demo",
  description: "Property Manager demo dashboard.",
};

export const dynamic = "force-dynamic";

function DemoSuccessBanner({ value }: { value?: string }) {
  const messages: Record<string, string> = {
    payment: "Demo payment saved. Sample data resets on reload.",
    check: "Demo payment saved. Sample data resets on reload.",
    "deleted-payment": "Demo payment deleted. Sample data resets on reload.",
    "deleted-check": "Demo payment deleted. Sample data resets on reload.",
    property: "Demo space created. Sample data resets on reload.",
  };
  const message = value ? messages[value] : null;

  if (!message) {
    return null;
  }

  return (
    <p className="mx-auto mt-4 max-w-7xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:px-6">
      {message}
    </p>
  );
}

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{
    addProperty?: string;
    addCheck?: string;
    demoSaved?: string;
    editPayment?: string;
    logPayment?: string;
    paidAmount?: string;
    paidAt?: string;
    paidProperty?: string;
    property?: string;
    propertyId?: string;
    leaseAdded?: string;
    demoLease?: string;
    note?: string;
    noteProperty?: string;
  }>;
}) {
  const query = await searchParams;
  const paymentSimulation = getDemoPaymentSimulation(query);
  const noteSimulation = getDemoNoteSimulation(query);
  const createdLease = getDemoCreatedLease(query);
  const { properties, needsAttention, allGood, summary } =
    getDemoDashboardData(paymentSimulation, createdLease, noteSimulation);
  const selectedProperty = query.property
    ? getDemoPropertyDetails(
        query.property,
        paymentSimulation,
        createdLease,
        noteSimulation,
      )
    : null;
  const queryState = new URLSearchParams();
  if (query.demoLease) {
    queryState.set("demoLease", query.demoLease);
  }
  if (query.noteProperty && query.note !== undefined) {
    queryState.set("noteProperty", query.noteProperty);
    queryState.set("note", query.note);
  }
  const demoBase = queryState.toString()
    ? `/demo?${queryState.toString()}`
    : "/demo";
  const propertyBaseHref = queryState.toString()
    ? `/demo?${queryState.toString()}&property=`
    : "/demo?property=";
  const selectedPropertyHref = selectedProperty
    ? `${propertyBaseHref}${selectedProperty.id}`
    : demoBase;
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
  const editingPayment =
    query.editPayment && selectedProperty
      ? selectedProperty.payments.find((payment) => payment.id === query.editPayment)
      : null;

  return (
    <>
      <DemoSuccessBanner value={query.demoSaved} />
      <DashboardView
        allGood={allGood}
        emptyActionHref="/demo?addProperty=1"
        needsAttention={needsAttention}
        propertyBaseHref={propertyBaseHref}
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
                href={`${propertyBaseHref}${query.propertyId}`}
              >
                Not yet
              </Link>
              <Link
                className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
                href={`${propertyBaseHref}${query.propertyId}&addCheck=1&propertyId=${query.propertyId}`}
              >
                Record payment
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      {selectedProperty ? (
        <PropertyPanel closeHref={demoBase} title={selectedProperty.name}>
          <PropertyDetailContent
            detail={selectedProperty}
            leaseAction={updateDemoLeaseInline}
            logPaymentHref={
              selectedLeaseCoversBillingMonth
                ? `${selectedPropertyHref}&addCheck=1&propertyId=${selectedProperty.id}`
                : undefined
            }
            paymentDeleteAction={deleteDemoPayment}
            paymentReturnHref={selectedPropertyHref}
            tenantAction={updateDemoTenant}
            tenantEmailHref={`/demo/email?property=${selectedProperty.id}`}
          />
        </PropertyPanel>
      ) : null}
      {query.addCheck === "1" || query.logPayment === "1" ? (
        <AddCheckModal
          action={logDemoPayment}
          clientRequestId={randomUUID()}
          closeHref={query.property ? selectedPropertyHref : demoBase}
          properties={paymentProperties}
          returnHref={query.property ? selectedPropertyHref : demoBase}
          selectedPropertyId={query.propertyId ?? selectedProperty?.id}
        />
      ) : null}
      {editingPayment && selectedProperty ? (
        <AddCheckModal
          action={editDemoPayment.bind(null, editingPayment.id)}
          clientRequestId={randomUUID()}
          closeHref={selectedPropertyHref}
          payment={{
            ...editingPayment,
            clientRequestId: randomUUID(),
            notes: null,
          }}
          properties={[{ id: selectedProperty.id, name: selectedProperty.name }]}
          returnHref={selectedPropertyHref}
          selectedPropertyId={selectedProperty.id}
        />
      ) : null}
      {query.addProperty === "1" ? (
        <AddPropertyModal
          action={createDemoPropertyWithLease}
          closeHref={demoBase}
        />
      ) : null}
    </>
  );
}
