import { randomUUID } from "node:crypto";

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
  }>;
}) {
  const query = await searchParams;
  const { properties, needsAttention, allGood, summary } = await getDashboardData();
  const selectedProperty = query.property
    ? await getPropertyDetails(query.property)
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

  return (
    <>
      <DashboardView
        allGood={allGood}
        needsAttention={needsAttention}
        propertyBaseHref="/?property="
        summary={summary}
      />
      {selectedProperty ? (
        <PropertyPanel closeHref="/" title={selectedProperty.name}>
          <PropertyDetailContent
            detail={selectedProperty}
            logPaymentHref={`/?property=${selectedProperty.id}&addCheck=1&propertyId=${selectedProperty.id}`}
            newLeaseHref={`/?property=${selectedProperty.id}&newLease=1`}
            paymentReturnHref={`/?property=${selectedProperty.id}`}
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
