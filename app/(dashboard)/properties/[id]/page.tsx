import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { PaymentModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import { getPropertyDetails } from "@/lib/property-details";
import { prisma } from "@/lib/prisma";

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
          logPaymentHref={`/properties/${detail.id}?logPayment=1`}
        />
      </PropertyPanel>

      {query.logPayment === "1" && lease ? (
        <PaymentModal
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
          selectedPropertyId={detail.id}
        />
      ) : null}

      {query.editPayment ? (
        <EditPaymentModal
          paymentId={query.editPayment}
          propertyId={detail.id}
          propertyName={detail.name}
        />
      ) : null}
    </>
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
