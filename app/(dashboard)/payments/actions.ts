"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { parseDollarAmount } from "@/lib/lease-periods";
import {
  allocatePayment,
  isRetryableTransactionError,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace-context";

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

function safeReturnHref(formData: FormData, fallback: string) {
  const value = String(formData.get("returnHref") ?? "");
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
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

async function findActiveLease(propertyId: string, workspaceId: string) {
  const currentMonth = firstDayOfCurrentMonth();

  return prisma.lease.findFirst({
    where: {
      propertyId,
      workspaceId,
      firstPeriodMonth: { lte: currentMonth },
      OR: [
        { lastPeriodMonth: null },
        { lastPeriodMonth: { gte: currentMonth } },
      ],
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
    const { workspaceId } = await getWorkspaceContext();
    const input = parsePaymentInput(formData);
    const existing = await prisma.payment.findUnique({
      where: {
        workspaceId_clientRequestId: {
          workspaceId,
          clientRequestId: input.clientRequestId,
        },
      },
    });

    if (!existing) {
      const lease = await findActiveLease(input.propertyId, workspaceId);
      if (!lease) {
        throw new Error("The selected property does not have an active lease.");
      }

      try {
        await prisma.$transaction(
          (tx) =>
            allocatePayment(tx, {
              workspaceId,
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
          where: {
            workspaceId_clientRequestId: {
              workspaceId,
              clientRequestId: input.clientRequestId,
            },
          },
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
      error: error instanceof Error ? error.message : "Unable to add check.",
    };
  }

  redirect(safeReturnHref(formData, "/"));
}

export async function editPayment(
  paymentId: string,
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const { workspaceId } = await getWorkspaceContext();
    const input = parsePaymentInput(formData);
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, workspaceId },
      select: { leaseId: true, lease: { select: { propertyId: true } } },
    });

    if (!payment) {
      throw new Error("Payment not found.");
    }
    if (payment.lease.propertyId !== input.propertyId) {
      throw new Error("Payment not found.");
    }

    await prisma.$transaction(
      (tx) =>
        allocatePayment(
          tx,
          {
            workspaceId,
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

  redirect(
    safeReturnHref(
      formData,
      `/properties/${String(formData.get("propertyId") ?? "")}`,
    ),
  );
}

export async function deletePayment(
  paymentId: string,
  propertyId: string,
  returnHref: string,
) {
  const { workspaceId } = await getWorkspaceContext();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, workspaceId, lease: { propertyId } },
      select: { id: true },
    });
    if (!payment) {
      throw new Error("Payment not found.");
    }
    await tx.paymentPeriod.updateMany({
      where: { paymentId, workspaceId },
      data: { status: "PENDING", paymentId: null },
    });
    await tx.payment.delete({ where: { id: paymentId, workspaceId } });
  }, transactionOptions);

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  redirect(
    returnHref.startsWith("/") && !returnHref.startsWith("//")
      ? returnHref
      : `/properties/${propertyId}`,
  );
}
