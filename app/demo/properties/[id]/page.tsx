import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import {
  getDemoPaymentSimulation,
  getDemoPropertyDetails,
} from "@/lib/demo-data";

import {
  deleteDemoPayment,
  editDemoPayment,
  logDemoPayment,
  updateDemoLeaseInline,
  updateDemoTenant,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function DemoPropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addCheck?: string;
    editPayment?: string;
    logPayment?: string;
    paidAmount?: string;
    paidAt?: string;
    paidProperty?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const paymentSimulation = getDemoPaymentSimulation(query);
  const detail = getDemoPropertyDetails(id, paymentSimulation);

  if (!detail) {
    notFound();
  }

  const lease = detail.activeLease;
  const editingPayment = query.editPayment
    ? detail.payments.find((payment) => payment.id === query.editPayment)
    : null;

  return (
    <>
      <PropertyPanel closeHref="/demo" title={detail.name}>
        <PropertyDetailContent
          detail={detail}
          leaseAction={updateDemoLeaseInline}
          logPaymentHref={`/demo/properties/${detail.id}?addCheck=1`}
          paymentDeleteAction={deleteDemoPayment}
          paymentReturnHref={`/demo/properties/${detail.id}`}
          tenantAction={updateDemoTenant}
          tenantEmailHref={`/demo/email?property=${detail.id}`}
        />
      </PropertyPanel>

      {(query.addCheck === "1" || query.logPayment === "1") && lease ? (
        <AddCheckModal
          action={logDemoPayment}
          clientRequestId={randomUUID()}
          closeHref={`/demo/properties/${detail.id}`}
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
          returnHref={`/demo/properties/${detail.id}`}
          selectedPropertyId={detail.id}
        />
      ) : null}

      {editingPayment ? (
        <AddCheckModal
          action={editDemoPayment.bind(null, editingPayment.id)}
          clientRequestId={randomUUID()}
          closeHref={`/demo/properties/${detail.id}`}
          payment={{
            ...editingPayment,
            clientRequestId: randomUUID(),
            notes: null,
          }}
          properties={[{ id: detail.id, name: detail.name }]}
          returnHref={`/demo/properties/${detail.id}`}
          selectedPropertyId={detail.id}
        />
      ) : null}
    </>
  );
}
