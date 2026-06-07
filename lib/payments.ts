import { PeriodStatus, Prisma, type PrismaClient } from "@prisma/client";

import { enumerateMonths } from "@/lib/lease-periods";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type PaymentInput = {
  leaseId: string;
  amountCents: number;
  receivedAt: Date;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  clientRequestId: string;
};

async function getCreditBalance(
  tx: TransactionClient,
  leaseId: string,
  excludedPaymentId?: string,
) {
  const [payments, allocated] = await Promise.all([
    tx.payment.aggregate({
      where: {
        leaseId,
        ...(excludedPaymentId ? { id: { not: excludedPaymentId } } : {}),
      },
      _sum: { amountCents: true },
    }),
    tx.paymentPeriod.aggregate({
      where: {
        leaseId,
        status: PeriodStatus.RECEIVED,
        ...(excludedPaymentId ? { paymentId: { not: excludedPaymentId } } : {}),
      },
      _sum: { amountDueCents: true },
    }),
  ]);

  return (
    (payments._sum.amountCents ?? 0) - (allocated._sum.amountDueCents ?? 0)
  );
}

export async function allocatePayment(
  tx: TransactionClient,
  input: PaymentInput,
  existingPaymentId?: string,
) {
  if (input.amountCents <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const lease = await tx.lease.findUnique({
    where: { id: input.leaseId },
    select: {
      id: true,
      firstPeriodMonth: true,
      rentCents: true,
      lastPeriodMonth: true,
    },
  });

  if (!lease) {
    throw new Error("The selected lease no longer exists.");
  }

  if (existingPaymentId) {
    await tx.paymentPeriod.updateMany({
      where: { paymentId: existingPaymentId },
      data: { status: PeriodStatus.PENDING, paymentId: null },
    });
  }

  const creditBalance = await getCreditBalance(
    tx,
    lease.id,
    existingPaymentId,
  );
  const effectiveAmount = creditBalance + input.amountCents;
  const monthsToCover = Math.floor(effectiveAmount / lease.rentCents);

  await tx.paymentPeriod.createMany({
    data: enumerateMonths(
      lease.firstPeriodMonth,
      lease.lastPeriodMonth,
    ).map((periodMonth) => ({
      leaseId: lease.id,
      periodMonth,
      amountDueCents: lease.rentCents,
    })),
    skipDuplicates: true,
  });

  const unpaidPeriods = await tx.paymentPeriod.findMany({
    where: {
      leaseId: lease.id,
      status: { in: [PeriodStatus.PENDING, PeriodStatus.LATE] },
    },
    orderBy: { periodMonth: "asc" },
  });

  if (monthsToCover > unpaidPeriods.length) {
    throw new Error("Payment exceeds remaining rent on this lease.");
  }

  const payment = existingPaymentId
    ? await tx.payment.update({
        where: { id: existingPaymentId },
        data: {
          receivedAt: input.receivedAt,
          amountCents: input.amountCents,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          notes: input.notes,
        },
      })
    : await tx.payment.create({ data: input });

  const coveredPeriodIds = unpaidPeriods
    .slice(0, monthsToCover)
    .map((period) => period.id);

  if (coveredPeriodIds.length > 0) {
    await tx.paymentPeriod.updateMany({
      where: { id: { in: coveredPeriodIds } },
      data: {
        status: PeriodStatus.RECEIVED,
        paymentId: payment.id,
      },
    });
  }

  return payment;
}

export function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}
