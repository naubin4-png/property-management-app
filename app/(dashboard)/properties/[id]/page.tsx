import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { EditPaymentModal } from "@/components/edit-payment-modal";
import { NewLeaseModal } from "@/components/new-lease-modal";
import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import { getPropertyDetails } from "@/lib/property-details";

import { logPayment } from "../../payments/actions";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addCheck?: string;
    editPayment?: string;
    logPayment?: string;
    newLease?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const detail = await getPropertyDetails(id);

  if (!detail) {
    notFound();
  }

  const lease = detail.activeLease;

  return (
    <>
      <PropertyPanel closeHref="/" title={detail.name}>
        <PropertyDetailContent
          detail={detail}
          logPaymentHref={`/properties/${detail.id}?addCheck=1`}
          newLeaseHref={`/properties/${detail.id}?newLease=1`}
          paymentReturnHref={`/properties/${detail.id}`}
        />
      </PropertyPanel>

      {(query.addCheck === "1" || query.logPayment === "1") && lease ? (
        <AddCheckModal
          action={logPayment}
          clientRequestId={randomUUID()}
          closeHref={`/properties/${detail.id}`}
          properties={[
            {
              id: detail.id,
              name: detail.name,
              rentCents: lease.rentCents,
              creditBalanceCents: lease.creditBalanceCents,
              nextDueDate:
                lease.periods.find((period) => period.status !== "RECEIVED")
                  ?.periodMonth ?? null,
            },
          ]}
          returnHref={`/properties/${detail.id}`}
          selectedPropertyId={detail.id}
        />
      ) : null}

      {query.editPayment ? (
        <EditPaymentModal
          paymentId={query.editPayment}
          propertyId={detail.id}
          propertyName={detail.name}
          returnHref={`/properties/${detail.id}`}
        />
      ) : null}
      {query.newLease === "1" && !lease ? (
        <NewLeaseModal
          closeHref={`/properties/${detail.id}`}
          propertyId={detail.id}
          propertyName={detail.name}
        />
      ) : null}
    </>
  );
}
