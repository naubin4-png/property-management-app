import { PaymentModal } from "@/components/payment-modal";
import { editPayment } from "@/app/(dashboard)/payments/actions";
import { prisma } from "@/lib/prisma";

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
      properties={[{ id: propertyId, name: propertyName }]}
      returnHref={returnHref}
      selectedPropertyId={propertyId}
    />
  );
}
