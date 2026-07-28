import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AddCheckModal } from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import {
  getDemoCreatedLease,
  getDemoNoteSimulation,
  getDemoPaymentSimulation,
  getDemoPropertyDetails,
  parseDemoSessionState,
} from "@/lib/demo-data";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";

import {
  deleteDemoPayment,
  editDemoPayment,
  logDemoPayment,
  updateDemoPropertyDetails,
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
    demoLease?: string;
    note?: string;
    noteProperty?: string;
  }>;
}) {
  const [{ id }, query, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);
  const demoSession = parseDemoSessionState(
    cookieStore.get("demo-detail-session")?.value,
  );
  const paymentSimulation = getDemoPaymentSimulation(query);
  const noteSimulation = getDemoNoteSimulation(query);
  const createdLease = getDemoCreatedLease(query);
  const detail = getDemoPropertyDetails(
    id,
    paymentSimulation,
    createdLease,
    noteSimulation,
    demoSession,
  );

  if (!detail) {
    notFound();
  }

  const lease = detail.activeLease;
  const currentMonth = firstDayOfCurrentMonth();
  const leaseCoversCurrentMonth =
    lease &&
    lease.firstPeriodMonth <= currentMonth &&
    (!lease.lastPeriodMonth || lease.lastPeriodMonth >= currentMonth);
  const routeParams = new URLSearchParams();
  if (query.demoLease) {
    routeParams.set("demoLease", query.demoLease);
  }
  if (query.noteProperty && query.note !== undefined) {
    routeParams.set("noteProperty", query.noteProperty);
    routeParams.set("note", query.note);
  }
  const routeState = routeParams.toString()
    ? `?${routeParams.toString()}`
    : "";
  const detailHref = `/demo/properties/${detail.id}${routeState}`;
  const dashboardHref = `/demo${routeState}`;
  const addCheckHref = routeState
    ? `${detailHref}&addCheck=1`
    : `${detailHref}?addCheck=1`;
  const editingPayment = query.editPayment
    ? detail.payments.find((payment) => payment.id === query.editPayment)
    : null;

  return (
    <>
      <PropertyPanel closeHref={dashboardHref} title={detail.name}>
        <PropertyDetailContent
          detailsAction={updateDemoPropertyDetails}
          detail={detail}
          logPaymentHref={leaseCoversCurrentMonth ? addCheckHref : undefined}
          paymentDeleteAction={deleteDemoPayment}
          paymentReturnHref={detailHref}
          remindersHref={`/demo/email?property=${detail.id}`}
        />
      </PropertyPanel>

      {(query.addCheck === "1" || query.logPayment === "1") &&
      leaseCoversCurrentMonth ? (
        <AddCheckModal
          action={logDemoPayment}
          clientRequestId={randomUUID()}
          closeHref={detailHref}
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
          returnHref={detailHref}
          selectedPropertyId={detail.id}
        />
      ) : null}

      {editingPayment ? (
        <AddCheckModal
          action={editDemoPayment.bind(null, editingPayment.id)}
          clientRequestId={randomUUID()}
          closeHref={detailHref}
          payment={{
            ...editingPayment,
            clientRequestId: randomUUID(),
            notes: editingPayment.notes,
          }}
          properties={[
            {
              id: detail.id,
              name: detail.name,
              rentCents: lease?.rentCents,
              creditBalanceCents: lease?.creditBalanceCents,
              nextDueDate:
                lease?.periods.find((period) => period.status !== "RECEIVED")
                  ?.periodMonth ?? null,
            },
          ]}
          returnHref={detailHref}
          selectedPropertyId={detail.id}
        />
      ) : null}
    </>
  );
}
