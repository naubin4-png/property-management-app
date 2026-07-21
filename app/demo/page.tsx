import { randomUUID } from "node:crypto";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import { getDemoDashboardData, getDemoPropertyDetails } from "@/lib/demo-data";

import {
  createDemoPropertyWithLease,
  deleteDemoPayment,
  editDemoPayment,
  logDemoPayment,
  saveDemoDashboardNote,
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
    check: "Demo check saved. Sample data resets on reload.",
    "deleted-check": "Demo check deleted. Sample data resets on reload.",
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
    property?: string;
    propertyId?: string;
  }>;
}) {
  const query = await searchParams;
  const { properties, needsAttention, allGood, summary } =
    getDemoDashboardData();
  const selectedProperty = query.property
    ? getDemoPropertyDetails(query.property)
    : null;
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
        onSaveNote={saveDemoDashboardNote}
        propertyBaseHref="/demo?property="
        summary={summary}
      />
      {selectedProperty ? (
        <PropertyPanel closeHref="/demo" title={selectedProperty.name}>
          <PropertyDetailContent
            detail={selectedProperty}
            leaseAction={updateDemoLeaseInline}
            logPaymentHref={`/demo?property=${selectedProperty.id}&addCheck=1&propertyId=${selectedProperty.id}`}
            paymentDeleteAction={deleteDemoPayment}
            paymentReturnHref={`/demo?property=${selectedProperty.id}`}
            tenantAction={updateDemoTenant}
            tenantEmailHref={`/demo/email?property=${selectedProperty.id}`}
          />
        </PropertyPanel>
      ) : null}
      {query.addCheck === "1" || query.logPayment === "1" ? (
        <AddCheckModal
          action={logDemoPayment}
          clientRequestId={randomUUID()}
          closeHref={query.property ? `/demo?property=${query.property}` : "/demo"}
          properties={paymentProperties}
          returnHref={query.property ? `/demo?property=${query.property}` : "/demo"}
          selectedPropertyId={query.propertyId ?? selectedProperty?.id}
        />
      ) : null}
      {editingPayment && selectedProperty ? (
        <AddCheckModal
          action={editDemoPayment.bind(null, editingPayment.id)}
          clientRequestId={randomUUID()}
          closeHref={`/demo?property=${selectedProperty.id}`}
          payment={{
            ...editingPayment,
            clientRequestId: randomUUID(),
            notes: null,
          }}
          properties={[{ id: selectedProperty.id, name: selectedProperty.name }]}
          returnHref={`/demo?property=${selectedProperty.id}`}
          selectedPropertyId={selectedProperty.id}
        />
      ) : null}
      {query.addProperty === "1" ? (
        <AddPropertyModal
          action={createDemoPropertyWithLease}
          closeHref="/demo"
        />
      ) : null}
    </>
  );
}
