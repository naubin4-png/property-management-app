import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PeriodStatus, Prisma } from "@prisma/client";

import {
  createLeaseWithPaymentTransaction,
  createLeaseWithPaymentIdempotently,
  type PaymentFirstLeaseInput,
} from "../lib/payment-first-lease";

function month(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

type Store = {
  properties: Array<{ id: string; workspaceId: string; name: string }>;
  tenants: Array<{ id: string; workspaceId: string; name: string; email: null }>;
  leases: Array<{
    id: string;
    workspaceId: string;
    propertyId: string;
    tenantId: string;
    firstPeriodMonth: Date;
    lastPeriodMonth: Date | null;
    rentCents: number;
    notes: null;
  }>;
  periods: Array<{
    id: string;
    workspaceId: string;
    leaseId: string;
    periodMonth: Date;
    amountDueCents: number;
    status: PeriodStatus;
    paymentId: string | null;
  }>;
  payments: Array<{
    id: string;
    workspaceId: string;
    leaseId: string;
    amountCents: number;
    clientRequestId: string;
  }>;
};

function cloneStore(store: Store): Store {
  return structuredClone(store);
}

function createClient(failAt?: "payment") {
  let store: Store = {
    properties: [],
    tenants: [],
    leases: [],
    periods: [],
    payments: [],
  };
  let queue = Promise.resolve();

  function transactionFor(draft: Store) {
    const ids = () =>
      draft.properties.length +
      draft.tenants.length +
      draft.leases.length +
      draft.payments.length +
      1;
    return {
      property: {
        create: async ({ data }: { data: Omit<Store["properties"][number], "id"> }) => {
          const record = { id: `property-${ids()}`, ...data };
          draft.properties.push(record);
          return record;
        },
      },
      tenant: {
        create: async ({ data }: { data: Omit<Store["tenants"][number], "id"> }) => {
          const record = { id: `tenant-${ids()}`, ...data };
          draft.tenants.push(record);
          return record;
        },
      },
      lease: {
        create: async ({ data }: { data: Omit<Store["leases"][number], "id"> }) => {
          const record = { id: `lease-${ids()}`, ...data };
          draft.leases.push(record);
          return record;
        },
        findUnique: async ({ where }: { where: { id: string; workspaceId: string } }) =>
          draft.leases.find(
            (lease) =>
              lease.id === where.id && lease.workspaceId === where.workspaceId,
          ) ?? null,
      },
      payment: {
        findUnique: async ({
          where,
        }: {
          where: {
            workspaceId_clientRequestId: {
              workspaceId: string;
              clientRequestId: string;
            };
          };
        }) => {
          const found = draft.payments.find(
            (payment) =>
              payment.workspaceId ===
                where.workspaceId_clientRequestId.workspaceId &&
              payment.clientRequestId ===
                where.workspaceId_clientRequestId.clientRequestId,
          );
          if (!found) return null;
          const lease = draft.leases.find((item) => item.id === found.leaseId)!;
          return { id: found.id, lease: { propertyId: lease.propertyId } };
        },
        aggregate: async ({ where }: { where: { leaseId: string; workspaceId: string } }) => ({
          _sum: {
            amountCents: draft.payments
              .filter(
                (payment) =>
                  payment.leaseId === where.leaseId &&
                  payment.workspaceId === where.workspaceId,
              )
              .reduce((sum, payment) => sum + payment.amountCents, 0),
          },
        }),
        create: async ({ data }: { data: Omit<Store["payments"][number], "id"> }) => {
          if (failAt === "payment") throw new Error("allocation failed");
          const record = { id: `payment-${ids()}`, ...data };
          draft.payments.push(record);
          return record;
        },
      },
      paymentPeriod: {
        createMany: async ({ data }: { data: Array<Omit<Store["periods"][number], "id" | "status" | "paymentId">> }) => {
          for (const item of data) {
            if (
              !draft.periods.some(
                (period) =>
                  period.leaseId === item.leaseId &&
                  period.periodMonth.getTime() === item.periodMonth.getTime(),
              )
            ) {
              draft.periods.push({
                id: `period-${draft.periods.length + 1}`,
                ...item,
                status: PeriodStatus.PENDING,
                paymentId: null,
              });
            }
          }
          return { count: data.length };
        },
        aggregate: async ({ where }: { where: { leaseId: string; workspaceId: string } }) => ({
          _sum: {
            amountDueCents: draft.periods
              .filter(
                (period) =>
                  period.leaseId === where.leaseId &&
                  period.workspaceId === where.workspaceId &&
                  period.status === PeriodStatus.RECEIVED,
              )
              .reduce((sum, period) => sum + period.amountDueCents, 0),
          },
        }),
        findMany: async ({ where }: { where: { leaseId: string; workspaceId: string } }) =>
          draft.periods
            .filter(
              (period) =>
                period.leaseId === where.leaseId &&
                period.workspaceId === where.workspaceId &&
                period.status !== PeriodStatus.RECEIVED,
            )
            .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime()),
        findFirst: async ({ where }: { where: { leaseId: string; workspaceId: string } }) =>
          draft.periods
            .filter(
              (period) =>
                period.leaseId === where.leaseId &&
                period.workspaceId === where.workspaceId,
            )
            .sort((a, b) => b.periodMonth.getTime() - a.periodMonth.getTime())[0] ??
          null,
        updateMany: async ({
          where,
          data,
        }: {
          where: { id: { in: string[] } };
          data: { status: PeriodStatus; paymentId: string };
        }) => {
          for (const period of draft.periods) {
            if (where.id.in.includes(period.id)) Object.assign(period, data);
          }
          return { count: where.id.in.length };
        },
      },
    };
  }

  const client = {
    $transaction: <T>(operation: (tx: never) => Promise<T>) => {
      const run = queue.then(async () => {
        const draft = cloneStore(store);
        const result = await operation(transactionFor(draft) as never);
        store = draft;
        return result;
      });
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };

  return { client, read: () => cloneStore(store) };
}

function input(overrides: Partial<PaymentFirstLeaseInput> = {}) {
  return {
    workspaceId: "workspace-a",
    currentMonth: month("2026-07"),
    propertyName: "North Store",
    tenantName: "Acme LLC",
    firstPeriodMonth: month("2026-07"),
    rentCents: 100000,
    amountCents: 100000,
    receivedAt: new Date("2026-07-15T00:00:00.000Z"),
    paymentMethod: "ACH",
    clientRequestId: "request-1",
    ...overrides,
  };
}

describe("payment-first lease transaction", () => {
  it("creates the workspace-scoped graph and allocates the payment", async () => {
    const { client, read } = createClient();
    await createLeaseWithPaymentTransaction(client as never, input());
    const state = read();

    assert.equal(state.properties.length, 1);
    assert.equal(state.tenants.length, 1);
    assert.equal(state.leases.length, 1);
    assert.equal(state.periods.length, 1);
    assert.equal(state.payments.length, 1);
    assert.equal(state.periods[0].status, PeriodStatus.RECEIVED);
    assert.ok(
      [
        ...state.properties,
        ...state.tenants,
        ...state.leases,
        ...state.periods,
        ...state.payments,
      ].every((record) => record.workspaceId === "workspace-a"),
    );
  });

  it("rolls the complete graph back when allocation fails", async () => {
    const { client, read } = createClient("payment");
    await assert.rejects(
      createLeaseWithPaymentTransaction(client as never, input()),
      /allocation failed/,
    );
    assert.deepEqual(read(), {
      properties: [],
      tenants: [],
      leases: [],
      periods: [],
      payments: [],
    });
  });

  it("makes duplicate and concurrent submissions idempotent", async () => {
    const { client, read } = createClient();
    const [first, second] = await Promise.all([
      createLeaseWithPaymentTransaction(client as never, input()),
      createLeaseWithPaymentTransaction(client as never, input()),
    ]);
    const state = read();

    assert.equal(state.properties.length, 1);
    assert.equal(state.payments.length, 1);
    assert.equal(first.propertyId, second.propertyId);
    assert.equal(second.duplicate, true);
  });

  it("retries serialization failures and accepts the winning duplicate", async () => {
    let attempts = 0;
    const retryError = new Prisma.PrismaClientKnownRequestError(
      "serialization conflict",
      { clientVersion: "test", code: "P2034" },
    );
    const client = {
      payment: {
        findUnique: async () =>
          attempts === 1
            ? { lease: { propertyId: "winning-property" } }
            : null,
      },
      $transaction: async () => {
        attempts += 1;
        throw retryError;
      },
    };

    const result = await createLeaseWithPaymentIdempotently(
      client as never,
      input(),
    );
    assert.equal(result.propertyId, "winning-property");
    assert.equal(result.duplicate, true);
    assert.equal(attempts, 1);
  });

  it("retries three times before surfacing an unresolved conflict", async () => {
    let attempts = 0;
    const retryError = new Prisma.PrismaClientKnownRequestError(
      "serialization conflict",
      { clientVersion: "test", code: "P2034" },
    );
    const client = {
      payment: { findUnique: async () => null },
      $transaction: async () => {
        attempts += 1;
        throw retryError;
      },
    };

    await assert.rejects(
      createLeaseWithPaymentIdempotently(client as never, input()),
      /serialization conflict/,
    );
    assert.equal(attempts, 3);
  });

  it("scopes the same request ID independently to each workspace", async () => {
    const { client, read } = createClient();
    await Promise.all([
      createLeaseWithPaymentTransaction(client as never, input()),
      createLeaseWithPaymentTransaction(
        client as never,
        input({
          workspaceId: "workspace-b",
          propertyName: "Other Workspace Unit",
        }),
      ),
    ]);

    const state = read();
    assert.equal(state.properties.length, 2);
    assert.equal(state.payments.length, 2);
    assert.deepEqual(
      new Set(state.payments.map((payment) => payment.workspaceId)),
      new Set(["workspace-a", "workspace-b"]),
    );
  });

  it("creates arrears from a backdated first month and applies oldest first", async () => {
    const { client, read } = createClient();
    await createLeaseWithPaymentTransaction(
      client as never,
      input({
        firstPeriodMonth: month("2026-05"),
        rentCents: 80000,
        amountCents: 160000,
      }),
    );
    assert.deepEqual(
      read().periods.map((period) => [
        period.periodMonth.toISOString().slice(0, 7),
        period.status,
      ]),
      [
        ["2026-05", PeriodStatus.RECEIVED],
        ["2026-06", PeriodStatus.RECEIVED],
        ["2026-07", PeriodStatus.PENDING],
      ],
    );
  });

  it("keeps partials as credit and creates future periods for advances", async () => {
    const partial = createClient();
    await createLeaseWithPaymentTransaction(
      partial.client as never,
      input({ amountCents: 40000 }),
    );
    assert.equal(partial.read().periods[0].status, PeriodStatus.PENDING);

    const advance = createClient();
    await createLeaseWithPaymentTransaction(
      advance.client as never,
      input({ amountCents: 300000 }),
    );
    assert.deepEqual(
      advance.read().periods.map((period) => period.status),
      [
        PeriodStatus.RECEIVED,
        PeriodStatus.RECEIVED,
        PeriodStatus.RECEIVED,
      ],
    );
  });

  it("uses the corrected monthly rent instead of the payment amount", async () => {
    const { client, read } = createClient();
    await createLeaseWithPaymentTransaction(
      client as never,
      input({ rentCents: 125000, amountCents: 250000 }),
    );
    assert.equal(read().leases[0].rentCents, 125000);
    assert.deepEqual(
      read().periods.map((period) => period.amountDueCents),
      [125000, 125000],
    );
  });
});
