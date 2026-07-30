import { PaymentModal } from "@/components/payment-modal";
import { editPayment } from "@/app/(dashboard)/payments/actions";
import { prisma } from "@/lib/prisma";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";

export async function EditPaymentModal({
  paymentId,
  propertyId,
  propertyName,
  returnHref,
}: {
  paymentId: string;
  propertyId: string;
  propertyName: string;
  returnHref: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      lease: { propertyId },
    },
    include: {
      lease: {
        include: {
          paymentPeriods: { orderBy: { periodMonth: "asc" } },
          payments: { select: { id: true, amountCents: true } },
        },
      },
    },
  });

  if (!payment) {
    return null;
  }

  return (
    <PaymentModal
      action={editPayment.bind(null, payment.id)}
      clientRequestId={payment.clientRequestId}
      closeHref={returnHref}
      payment={payment}
      properties={[
        {
          id: propertyId,
          name: propertyName,
          forecast: {
            currentMonth: firstDayOfCurrentMonth(),
            editedPaymentId: payment.id,
            firstPeriodMonth: payment.lease.firstPeriodMonth,
            lastPeriodMonth: payment.lease.lastPeriodMonth,
            payments: payment.lease.payments,
            periods: payment.lease.paymentPeriods,
            rentCents: payment.lease.rentCents,
          },
        },
      ]}
      returnHref={returnHref}
      selectedPropertyId={propertyId}
    />
  );
}
