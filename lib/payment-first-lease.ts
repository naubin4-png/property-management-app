import { Prisma, type PrismaClient } from "@prisma/client";

import { enumerateLeaseMonths } from "@/lib/lease-periods";
import { allocatePayment } from "@/lib/payments";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type PaymentFirstLeaseInput = {
  workspaceId: string;
  currentMonth: Date;
  propertyName: string;
  tenantName: string;
  firstPeriodMonth: Date;
  rentCents: number;
  amountCents: number;
  receivedAt: Date;
  paymentMethod: string | null;
  clientRequestId: string;
};

type TransactionRunner = {
  $transaction<T>(
    operation: (tx: TransactionClient) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

type IdempotentTransactionRunner = TransactionRunner & {
  payment: {
    findUnique(input: {
      where: {
        workspaceId_clientRequestId: {
          workspaceId: string;
          clientRequestId: string;
        };
      };
      select: { lease: { select: { propertyId: true } } };
    }): Promise<{ lease: { propertyId: string } } | null>;
  };
};

export function createLeaseWithPaymentTransaction(
  client: TransactionRunner,
  input: PaymentFirstLeaseInput,
) {
  return client.$transaction(
    (tx) => createLeaseWithPayment(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}

export async function createLeaseWithPaymentIdempotently(
  client: IdempotentTransactionRunner,
  input: PaymentFirstLeaseInput,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createLeaseWithPaymentTransaction(client, input);
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error;
      }
      lastError = error;
      const duplicate = await client.payment.findUnique({
        where: {
          workspaceId_clientRequestId: {
            workspaceId: input.workspaceId,
            clientRequestId: input.clientRequestId,
          },
        },
        select: { lease: { select: { propertyId: true } } },
      });
      if (duplicate) {
        return {
          paymentId: null,
          propertyId: duplicate.lease.propertyId,
          duplicate: true,
        };
      }
    }
  }

  throw lastError;
}

export async function createLeaseWithPayment(
  tx: TransactionClient,
  input: PaymentFirstLeaseInput,
) {
  const duplicate = await tx.payment.findUnique({
    where: {
      workspaceId_clientRequestId: {
        workspaceId: input.workspaceId,
        clientRequestId: input.clientRequestId,
      },
    },
    select: {
      id: true,
      lease: { select: { propertyId: true } },
    },
  });

  if (duplicate) {
    return {
      paymentId: duplicate.id,
      propertyId: duplicate.lease.propertyId,
      duplicate: true,
    };
  }

  const property = await tx.property.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.propertyName,
    },
  });
  const tenant = await tx.tenant.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.tenantName,
      email: null,
    },
  });
  const lease = await tx.lease.create({
    data: {
      workspaceId: input.workspaceId,
      propertyId: property.id,
      tenantId: tenant.id,
      firstPeriodMonth: input.firstPeriodMonth,
      lastPeriodMonth: null,
      rentCents: input.rentCents,
      notes: null,
    },
  });

  await tx.paymentPeriod.createMany({
    data: enumerateLeaseMonths({
      firstPeriodMonth: input.firstPeriodMonth,
      lastPeriodMonth: null,
      minimumThrough: input.currentMonth,
    }).map((periodMonth) => ({
      workspaceId: input.workspaceId,
      leaseId: lease.id,
      periodMonth,
      amountDueCents: input.rentCents,
    })),
  });

  const payment = await allocatePayment(tx, {
    workspaceId: input.workspaceId,
    currentMonth: input.currentMonth,
    leaseId: lease.id,
    amountCents: input.amountCents,
    receivedAt: input.receivedAt,
    paymentMethod: input.paymentMethod,
    paymentReference: null,
    notes: null,
    clientRequestId: input.clientRequestId,
  });

  return {
    paymentId: payment.id,
    propertyId: property.id,
    duplicate: false,
  };
}
