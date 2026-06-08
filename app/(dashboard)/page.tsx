import { randomUUID } from "node:crypto";

import { AddPropertyModal } from "@/components/add-property-modal";
import { DashboardView } from "@/components/dashboard-view";
import { LogPaymentModal } from "@/components/payment-modal";
import { getDashboardData } from "@/lib/dashboard";

import { logPayment } from "./payments/actions";
import { createPropertyWithLease } from "./properties/new/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    addProperty?: string;
    logPayment?: string;
    propertyId?: string;
  }>;
}) {
  const query = await searchParams;
  const { properties, needsAttention, allGood, summary } = await getDashboardData();
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
        summary={summary}
      />
      {query.logPayment === "1" ? (
        <LogPaymentModal
          action={logPayment}
          clientRequestId={randomUUID()}
          closeHref="/"
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
