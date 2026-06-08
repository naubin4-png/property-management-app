"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseDollarAmount } from "@/lib/lease-periods";
import {
  allocatePayment,
  isRetryableTransactionError,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export type PaymentActionState = {
  error: string | null;
};

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parsePaymentInput(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  const amountCents = parseDollarAmount(String(formData.get("amount") ?? ""));
  const receivedAtValue = String(formData.get("receivedAt") ?? "");
  const receivedAt = new Date(`${receivedAtValue}T00:00:00.000Z`);
  const clientRequestId = String(formData.get("clientRequestId") ?? "");

  if (!propertyId || !receivedAtValue || !clientRequestId) {
    throw new Error("Property, amount, and date received are required.");
  }

  if (amountCents === null) {
    throw new Error("Enter a valid payment amount.");
  }

  if (!Number.isFinite(receivedAt.getTime())) {
    throw new Error("Enter a valid date received.");
  }

  return {
    propertyId,
    amountCents,
    receivedAt,
    paymentMethod: optionalString(formData.get("paymentMethod")),
    paymentReference: null,
    notes: optionalString(formData.get("notes")),
    clientRequestId,
  };
}

async function findActiveLease(propertyId: string) {
  const currentMonth = new Date();
  currentMonth.setUTCDate(1);
  currentMonth.setUTCHours(0, 0, 0, 0);

  return prisma.lease.findFirst({
    where: {
      propertyId,
      lastPeriodMonth: { gte: currentMonth },
    },
    orderBy: { firstPeriodMonth: "desc" },
    select: { id: true },
  });
}

export async function logPayment(
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const input = parsePaymentInput(formData);
    const existing = await prisma.payment.findUnique({
      where: { clientRequestId: input.clientRequestId },
    });

    if (!existing) {
      const lease = await findActiveLease(input.propertyId);
      if (!lease) {
        throw new Error("The selected property does not have an active lease.");
      }

      try {
        await prisma.$transaction(
          (tx) =>
            allocatePayment(tx, {
              leaseId: lease.id,
              amountCents: input.amountCents,
              receivedAt: input.receivedAt,
              paymentMethod: input.paymentMethod,
              paymentReference: input.paymentReference,
              notes: input.notes,
              clientRequestId: input.clientRequestId,
            }),
          transactionOptions,
        );
      } catch (error) {
        if (!isRetryableTransactionError(error)) {
          throw error;
        }

        const duplicate = await prisma.payment.findUnique({
          where: { clientRequestId: input.clientRequestId },
        });
        if (!duplicate) {
          throw error;
        }
      }
    }

    revalidatePath("/");
    revalidatePath(`/properties/${input.propertyId}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to log payment.",
    };
  }

  redirect("/");
}

export async function editPayment(
  paymentId: string,
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const input = parsePaymentInput(formData);
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { leaseId: true },
    });

    if (!payment) {
      throw new Error("Payment not found.");
    }

    await prisma.$transaction(
      (tx) =>
        allocatePayment(
          tx,
          {
            leaseId: payment.leaseId,
            amountCents: input.amountCents,
            receivedAt: input.receivedAt,
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference,
            notes: input.notes,
            clientRequestId: input.clientRequestId,
          },
          paymentId,
        ),
      transactionOptions,
    );

    revalidatePath("/");
    revalidatePath(`/properties/${input.propertyId}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to edit payment.",
    };
  }

  redirect(`/properties/${String(formData.get("propertyId") ?? "")}`);
}

export async function deletePayment(paymentId: string, propertyId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.paymentPeriod.updateMany({
      where: { paymentId },
      data: { status: "PENDING", paymentId: null },
    });
    await tx.payment.delete({ where: { id: paymentId } });
  }, transactionOptions);

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}`);
}
