import { randomUUID } from "node:crypto";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { LogPaymentModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import { getDashboardData } from "@/lib/dashboard";
import { getPropertyDetails } from "@/lib/property-details";

import { logPayment } from "./payments/actions";
import { createPropertyWithLease } from "./properties/new/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    addProperty?: string;
    logPayment?: string;
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
            logPaymentHref={`/?property=${selectedProperty.id}&logPayment=1&propertyId=${selectedProperty.id}`}
          />
        </PropertyPanel>
      ) : null}
      {query.logPayment === "1" ? (
        <LogPaymentModal
          action={logPayment}
          clientRequestId={randomUUID()}
          closeHref={query.property ? `/?property=${query.property}` : "/"}
          properties={paymentProperties}
          selectedPropertyId={query.propertyId}
        />
      ) : null}
      {query.addProperty === "1" ? (
        <AddPropertyModal action={createPropertyWithLease} closeHref="/" />
      ) : null}
    </>
  );
}
