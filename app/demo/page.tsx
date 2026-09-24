import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import Link from "next/link";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import {
  demoReceivedAtDefault,
  getDemoDashboardData,
  getDemoCreatedLease,
  getDemoNoteSimulation,
  getDemoPaymentSimulation,
  getDemoPropertyDetails,
  parseDemoSessionState,
} from "@/lib/demo-data";
import { expectedPaymentAmount } from "@/lib/rent-ledger";

import {
  createDemoPropertyWithLease,
  deleteDemoPayment,
  editDemoPayment,
  logDemoPayment,
  updateDemoPropertyDetails,
  updateDemoLeaseNote,
} from "./actions";

export const metadata = {
  title: "Property Manager Demo",
  description: "Property Manager demo dashboard.",
};

export const dynamic = "force-dynamic";

function DemoSuccessBanner({ value }: { value?: string }) {
  const messages: Record<string, string> = {
    payment: "Demo payment saved temporarily for this browser session.",
    check: "Demo payment saved temporarily for this browser session.",
    "deleted-payment":
      "Demo payment deleted temporarily for this browser session.",
    "deleted-check":
      "Demo payment deleted temporarily for this browser session.",
    property: "Demo lease created temporarily for this browser session.",
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
  const [query, cookieStore] = await Promise.all([searchParams, cookies()]);
  const demoSession = parseDemoSessionState(
    cookieStore.get("demo-detail-session")?.value,
  );
  const paymentSimulation = getDemoPaymentSimulation(query);
  const noteSimulation = getDemoNoteSimulation(query);
  const createdLeases = [
    ...demoSession.createdLeases,
    ...(demoSession.createdLeases.length === 0 && query.demoLease
      ? [query.demoLease]
      : []),
  ]
    .map((demoLease) => getDemoCreatedLease({ demoLease }))
    .filter((lease) => lease !== null);
  const { properties, needsAttention, allGood, summary } =
    getDemoDashboardData(
      paymentSimulation,
      createdLeases,
      noteSimulation,
      demoSession,
    );
  const selectedProperty = query.property
    ? getDemoPropertyDetails(
        query.property,
        paymentSimulation,
        createdLeases,
        noteSimulation,
        demoSession,
      )
    : null;
  const queryState = new URLSearchParams();
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
      expectedPaymentCents: property.expectedPaymentCents,
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
        emptyPaymentHref="/demo?addCheck=1"
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
            detailsAction={updateDemoPropertyDetails}
            noteAction={updateDemoLeaseNote}
            detail={selectedProperty}
            logPaymentHref={
              selectedLeaseCoversBillingMonth
                ? `${selectedPropertyHref}&addCheck=1&propertyId=${selectedProperty.id}`
                : undefined
            }
            paymentDeleteAction={deleteDemoPayment}
            paymentReturnHref={selectedPropertyHref}
            remindersHref={`/demo/email?property=${selectedProperty.id}`}
          />
        </PropertyPanel>
      ) : null}
      {query.addCheck === "1" || query.logPayment === "1" ? (
        <AddCheckModal
          action={logDemoPayment}
          clientRequestId={randomUUID()}
          closeHref={query.property ? selectedPropertyHref : demoBase}
          defaultReceivedAt={demoReceivedAtDefault()}
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
            notes: editingPayment.notes,
          }}
          properties={[
            {
              id: selectedProperty.id,
              name: selectedProperty.name,
              rentCents: selectedProperty.activeLease?.rentCents,
              creditBalanceCents:
                selectedProperty.activeLease?.creditBalanceCents,
              expectedPaymentCents: selectedProperty.activeLease
                ? expectedPaymentAmount({
                    creditBalanceCents:
                      selectedProperty.activeLease.creditBalanceCents,
                    nextDueAmountCents:
                      selectedProperty.activeLease.periods.find(
                        (period) => period.status !== "RECEIVED",
                      )?.amountDueCents ?? null,
                    rentCents: selectedProperty.activeLease.rentCents,
                  })
                : null,
              nextDueDate:
                selectedProperty.activeLease?.periods.find(
                  (period) => period.status !== "RECEIVED",
                )?.periodMonth ?? null,
              forecast: selectedProperty.activeLease
                ? {
                    currentMonth: summary.billingPeriodMonth,
                    editedPaymentId: editingPayment.id,
                    ensurePeriodsThroughCurrent: false,
                    firstPeriodMonth:
                      selectedProperty.activeLease.firstPeriodMonth,
                    lastPeriodMonth:
                      selectedProperty.activeLease.lastPeriodMonth,
                    payments: selectedProperty.payments.map((payment) => ({
                      id: payment.id,
                      amountCents: payment.amountCents,
                    })),
                    periods: selectedProperty.activeLease.periods,
                    rentCents: selectedProperty.activeLease.rentCents,
                  }
                : undefined,
            },
          ]}
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
