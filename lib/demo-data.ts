import type { EmailSettingsViewData } from "@/components/email-settings-view";
import type { DashboardProperty } from "@/lib/dashboard";
import type {
  PropertyDetailData,
  PropertyPeriodStatus,
} from "@/lib/property-details";
import { defaultEmailSettings } from "@/lib/settings";

type DemoPeriodStatus = "PENDING" | "RECEIVED" | "LATE";

type DemoPeriod = {
  id: string;
  periodMonth: Date;
  amountDueCents: number;
  status: DemoPeriodStatus;
  paymentId?: string;
};

type DemoPayment = {
  id: string;
  receivedAt: Date;
  amountCents: number;
  paymentMethod: string | null;
  paymentReference: string | null;
};

type DemoEmailActivity = {
  label: string;
  sentAt: Date;
} | null;

export type DemoPropertyRecord = {
  id: string;
  name: string;
  leaseId: string;
  firstPeriodMonth?: Date;
  lastPeriodMonth?: Date | null;
  tenantName: string;
  tenantEmail: string | null;
  rentCents: number;
  note: string;
  creditBalanceCents: number;
  latestEmail: DemoEmailActivity;
  periods: DemoPeriod[];
  payments: DemoPayment[];
};

export type DemoPaymentSimulation = {
  amountCents: number;
  propertyId: string;
  receivedAt: Date;
};

export type DemoNoteSimulation = {
  note: string;
  propertyId: string;
};

export type DemoCreatedLeaseInput = {
  propertyName: string;
  tenantName: string;
  tenantEmail: string | null;
  firstPeriodMonth: Date;
  lastPeriodMonth: Date | null;
  rentCents: number;
};

type EncodedDemoLease = {
  propertyName: string;
  tenantName: string;
  tenantEmail: string | null;
  firstPeriodMonth: string;
  lastPeriodMonth: string | null;
  rentCents: number;
};

export function getDemoPaymentSimulation(query: {
  paidAmount?: string;
  paidAt?: string;
  paidProperty?: string;
}): DemoPaymentSimulation | null {
  const amountCents = Number(query.paidAmount);
  const propertyId = query.paidProperty;
  const receivedAt = new Date(`${query.paidAt ?? ""}T00:00:00.000Z`);

  if (
    !propertyId ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    !Number.isFinite(receivedAt.getTime())
  ) {
    return null;
  }

  return {
    amountCents,
    propertyId,
    receivedAt,
  };
}

export function getDemoNoteSimulation(query: {
  note?: string;
  noteProperty?: string;
}): DemoNoteSimulation | null {
  if (!query.noteProperty || query.note === undefined) {
    return null;
  }

  return {
    note: query.note,
    propertyId: query.noteProperty,
  };
}

const demoBillingPeriod = new Date("2026-07-01T00:00:00.000Z");
const demoToday = new Date("2026-07-22T00:00:00.000Z");
const demoComingMonth = new Date("2026-08-01T00:00:00.000Z");
const firstPeriodMonth = new Date("2026-01-01T00:00:00.000Z");
const lastPeriodMonth = new Date("2027-12-01T00:00:00.000Z");

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function encodeDemoCreatedLease(input: DemoCreatedLeaseInput) {
  const payload: EncodedDemoLease = {
    propertyName: input.propertyName,
    tenantName: input.tenantName,
    tenantEmail: input.tenantEmail,
    firstPeriodMonth: input.firstPeriodMonth.toISOString(),
    lastPeriodMonth: input.lastPeriodMonth?.toISOString() ?? null,
    rentCents: input.rentCents,
  };

  return encodeBase64Url(JSON.stringify(payload));
}

export function getDemoCreatedLease(query: {
  demoLease?: string;
}): DemoPropertyRecord | null {
  if (!query.demoLease) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(query.demoLease)) as Partial<
      EncodedDemoLease
    >;
    const firstTrackedMonth = new Date(payload.firstPeriodMonth ?? "");
    const lastTrackedMonth = payload.lastPeriodMonth
      ? new Date(payload.lastPeriodMonth)
      : null;
    const rentCents = Number(payload.rentCents);

    if (
      !payload.propertyName ||
      !payload.tenantName ||
      !Number.isInteger(rentCents) ||
      rentCents <= 0 ||
      !Number.isFinite(firstTrackedMonth.getTime()) ||
      (lastTrackedMonth && !Number.isFinite(lastTrackedMonth.getTime())) ||
      (lastTrackedMonth && lastTrackedMonth < firstTrackedMonth)
    ) {
      return null;
    }

    const id = `demo-created-${slugify(payload.propertyName) || "lease"}`;
    const coversCurrent =
      firstTrackedMonth <= demoBillingPeriod &&
      (!lastTrackedMonth || lastTrackedMonth >= demoBillingPeriod);
    const visiblePeriodMonth = coversCurrent
      ? demoBillingPeriod
      : firstTrackedMonth;

    return {
      id,
      name: payload.propertyName,
      leaseId: `${id}-lease`,
      firstPeriodMonth: firstTrackedMonth,
      lastPeriodMonth: lastTrackedMonth,
      tenantName: payload.tenantName,
      tenantEmail: payload.tenantEmail ?? null,
      rentCents,
      note: "",
      creditBalanceCents: 0,
      latestEmail: null,
      periods: [
        {
          id: `${id}-${visiblePeriodMonth.toISOString().slice(0, 7)}`,
          periodMonth: visiblePeriodMonth,
          amountDueCents: rentCents,
          status: coversCurrent ? "LATE" : "PENDING",
        },
      ],
      payments: [],
    };
  } catch {
    return null;
  }
}

const demoRecords: DemoPropertyRecord[] = [
  {
    id: "harbor-office",
    name: "Harbor Office Suite 4",
    leaseId: "harbor-lease",
    tenantName: "Maya Chen",
    tenantEmail: "maya@example.com",
    rentCents: 400000,
    note: "Call about the remaining balance",
    creditBalanceCents: 0,
    latestEmail: {
      label: "Late notice sent",
      sentAt: new Date("2026-07-05T00:00:00.000Z"),
    },
    periods: [
      {
        id: "harbor-office-jun",
        periodMonth: new Date("2026-06-01T00:00:00.000Z"),
        amountDueCents: 400000,
        status: "RECEIVED",
        paymentId: "harbor-office-payment",
      },
      {
        id: "harbor-office-jul",
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        amountDueCents: 400000,
        status: "LATE",
      },
      {
        id: "harbor-office-aug",
        periodMonth: new Date("2026-08-01T00:00:00.000Z"),
        amountDueCents: 400000,
        status: "PENDING",
      },
    ],
    payments: [
      {
        id: "harbor-office-payment",
        receivedAt: new Date("2026-06-03T00:00:00.000Z"),
        amountCents: 400000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  },
  {
    id: "riverside-warehouse",
    name: "Riverside Warehouse",
    leaseId: "riverside-lease",
    tenantName: "Noah Williams",
    tenantEmail: "noah@example.com",
    rentCents: 680000,
    note: "Tenant confirmed payment is scheduled",
    creditBalanceCents: 0,
    latestEmail: {
      label: "Reminder sent",
      sentAt: new Date("2026-07-05T00:00:00.000Z"),
    },
    periods: [
      {
        id: "riverside-warehouse-jun",
        periodMonth: new Date("2026-06-01T00:00:00.000Z"),
        amountDueCents: 680000,
        status: "RECEIVED",
        paymentId: "riverside-warehouse-payment",
      },
      {
        id: "riverside-warehouse-jul",
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        amountDueCents: 680000,
        status: "LATE",
      },
      {
        id: "riverside-warehouse-aug",
        periodMonth: new Date("2026-08-01T00:00:00.000Z"),
        amountDueCents: 680000,
        status: "PENDING",
      },
    ],
    payments: [
      {
        id: "riverside-warehouse-payment",
        receivedAt: new Date("2026-06-03T00:00:00.000Z"),
        amountCents: 680000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  },
  {
    id: "market-street",
    name: "88 Market Street",
    leaseId: "market-lease",
    tenantName: "Avery Johnson",
    tenantEmail: "avery@example.com",
    rentCents: 325000,
    note: "Renewal conversation in August",
    creditBalanceCents: 0,
    latestEmail: null,
    periods: [
      {
        id: "market-street-jul",
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        amountDueCents: 325000,
        status: "RECEIVED",
        paymentId: "market-street-payment",
      },
      {
        id: "market-street-aug",
        periodMonth: new Date("2026-08-01T00:00:00.000Z"),
        amountDueCents: 325000,
        status: "RECEIVED",
        paymentId: "market-street-payment",
      },
      {
        id: "market-street-sep",
        periodMonth: new Date("2026-09-01T00:00:00.000Z"),
        amountDueCents: 325000,
        status: "PENDING",
      },
    ],
    payments: [
      {
        id: "market-street-payment",
        receivedAt: new Date("2026-07-04T00:00:00.000Z"),
        amountCents: 650000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  },
  {
    id: "lakeview-retail",
    name: "Lakeview Retail",
    leaseId: "lakeview-lease",
    tenantName: "Samira Patel",
    tenantEmail: "samira@example.com",
    rentCents: 520000,
    note: "Waiting on the tenant's updated payment date",
    creditBalanceCents: 310000,
    latestEmail: {
      label: "Late notice sent",
      sentAt: new Date("2026-07-08T00:00:00.000Z"),
    },
    periods: [
      {
        id: "lakeview-retail-jun",
        periodMonth: new Date("2026-06-01T00:00:00.000Z"),
        amountDueCents: 520000,
        status: "RECEIVED",
        paymentId: "lakeview-retail-june-payment",
      },
      {
        id: "lakeview-retail-jul",
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        amountDueCents: 520000,
        status: "LATE",
      },
      {
        id: "lakeview-retail-aug",
        periodMonth: new Date("2026-08-01T00:00:00.000Z"),
        amountDueCents: 520000,
        status: "PENDING",
      },
    ],
    payments: [
      {
        id: "lakeview-retail-july-partial",
        receivedAt: new Date("2026-07-10T00:00:00.000Z"),
        amountCents: 310000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
      {
        id: "lakeview-retail-june-payment",
        receivedAt: new Date("2026-06-03T00:00:00.000Z"),
        amountCents: 520000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  },
  {
    id: "cedar-studio",
    name: "Cedar Street Studio",
    leaseId: "cedar-lease",
    tenantName: "Jordan Lee",
    tenantEmail: null,
    rentCents: 275000,
    note: "",
    creditBalanceCents: 0,
    latestEmail: null,
    periods: [
      {
        id: "cedar-studio-jul",
        periodMonth: new Date("2026-07-01T00:00:00.000Z"),
        amountDueCents: 275000,
        status: "RECEIVED",
        paymentId: "cedar-studio-payment",
      },
      {
        id: "cedar-studio-aug",
        periodMonth: new Date("2026-08-01T00:00:00.000Z"),
        amountDueCents: 275000,
        status: "PENDING",
      },
    ],
    payments: [
      {
        id: "cedar-studio-payment",
        receivedAt: new Date("2026-07-03T00:00:00.000Z"),
        amountCents: 275000,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  },
];

function cloneRecord(record: DemoPropertyRecord): DemoPropertyRecord {
  return {
    ...record,
    firstPeriodMonth: record.firstPeriodMonth
      ? new Date(record.firstPeriodMonth)
      : undefined,
    lastPeriodMonth: record.lastPeriodMonth
      ? new Date(record.lastPeriodMonth)
      : record.lastPeriodMonth,
    latestEmail: record.latestEmail
      ? { ...record.latestEmail, sentAt: new Date(record.latestEmail.sentAt) }
      : null,
    periods: record.periods.map((period) => ({
      ...period,
      periodMonth: new Date(period.periodMonth),
    })),
    payments: record.payments.map((payment) => ({
      ...payment,
      receivedAt: new Date(payment.receivedAt),
    })),
  };
}

function cloneRecords(): DemoPropertyRecord[] {
  return demoRecords.map(cloneRecord);
}

function applyNoteSimulation(
  records: DemoPropertyRecord[],
  simulation?: DemoNoteSimulation | null,
) {
  if (!simulation) {
    return records;
  }

  const record = records.find((item) => item.id === simulation.propertyId);
  if (record) {
    record.note = simulation.note.trim();
  }

  return records;
}

function applyPaymentSimulation(
  records: DemoPropertyRecord[],
  simulation?: DemoPaymentSimulation | null,
) {
  if (!simulation || simulation.amountCents <= 0) {
    return records;
  }

  const record = records.find((item) => item.id === simulation.propertyId);
  if (!record) {
    return records;
  }

  const paymentId = `${record.id}-simulated-payment`;
  let remainingCents = simulation.amountCents;
  for (const period of record.periods) {
    if (
      remainingCents < period.amountDueCents ||
      (period.status !== "PENDING" && period.status !== "LATE")
    ) {
      continue;
    }

    period.status = "RECEIVED";
    period.paymentId = paymentId;
    remainingCents -= period.amountDueCents;
  }

  record.payments.unshift({
    id: paymentId,
    receivedAt: simulation.receivedAt,
    amountCents: simulation.amountCents,
    paymentMethod: "CHECK",
    paymentReference: null,
  });

  return records;
}

function getRecords(
  simulation?: DemoPaymentSimulation | null,
  createdLease?: DemoPropertyRecord | null,
  noteSimulation?: DemoNoteSimulation | null,
) {
  const records = cloneRecords();
  if (createdLease) {
    records.push(cloneRecord(createdLease));
  }

  return applyPaymentSimulation(
    applyNoteSimulation(records, noteSimulation),
    simulation,
  );
}

function unpaidPeriods(record: DemoPropertyRecord) {
  return record.periods
    .filter(
      (period) => period.status === "PENDING" || period.status === "LATE",
    )
    .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime());
}

function dashboardPropertyFromRecord(
  record: DemoPropertyRecord,
): DashboardProperty {
  const paymentById = new Map(
    record.payments.map((payment) => [payment.id, payment]),
  );
  const billingPeriod = record.periods.find(
    (period) => period.periodMonth.getTime() === demoBillingPeriod.getTime(),
  );
  const nextDue = unpaidPeriods(record)[0] ?? null;
  const hasEarlierUnpaid = record.periods.some(
    (period) =>
      period.periodMonth < demoBillingPeriod &&
      (period.status === "PENDING" || period.status === "LATE"),
  );
  const creditAppliedToBillingPeriod =
    billingPeriod &&
    billingPeriod.status !== "RECEIVED" &&
    !hasEarlierUnpaid
      ? Math.min(record.creditBalanceCents, billingPeriod.amountDueCents)
      : 0;
  const billingPeriodRemainingCents = billingPeriod
    ? billingPeriod.status === "RECEIVED"
      ? 0
      : Math.max(
          billingPeriod.amountDueCents - creditAppliedToBillingPeriod,
          0,
        )
    : 0;
  const billingPeriodPaidAt =
    billingPeriod?.paymentId && billingPeriod.status === "RECEIVED"
      ? (paymentById.get(billingPeriod.paymentId)?.receivedAt ?? null)
      : null;
  const activeForBillingPeriod = Boolean(billingPeriod);
  const status =
    !activeForBillingPeriod
      ? "NO_LEASE"
      : billingPeriodRemainingCents === 0
      ? "PAID"
      : billingPeriod?.status === "LATE"
        ? "LATE"
        : "DUE";
  const paidAheadPayment =
    nextDue && nextDue.periodMonth > demoComingMonth
      ? record.payments.find(
          (payment) =>
            record.periods.filter(
              (period) =>
                period.status === "RECEIVED" &&
                period.paymentId === payment.id,
            ).length > 1,
        )
      : null;

  return {
    id: record.id,
    name: record.name,
    leaseId: record.leaseId,
    rentCents: record.rentCents,
    nextDueDate: nextDue?.periodMonth ?? null,
    status,
    hasActiveLease: activeForBillingPeriod,
    note: record.note,
    latestEmail: record.latestEmail,
    advancePayment: paidAheadPayment
      ? {
          monthsPaid: record.periods.filter(
            (period) =>
              period.status === "RECEIVED" &&
              period.paymentId === paidAheadPayment.id,
          ).length,
          paidAt: paidAheadPayment.receivedAt,
          paidThrough: record.periods
            .filter(
              (period) =>
                period.status === "RECEIVED" &&
                period.paymentId === paidAheadPayment.id,
            )
            .sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime())
            .at(-1)!.periodMonth,
        }
      : null,
    billingPeriodMonth: billingPeriod?.periodMonth ?? demoBillingPeriod,
    billingPeriodPaidAt,
    billingPeriodRemainingCents,
    amountOwedCents: billingPeriodRemainingCents,
    creditBalanceCents: record.creditBalanceCents,
  };
}

function periodStatus(period: DemoPeriod): PropertyPeriodStatus {
  if (period.status === "RECEIVED") {
    return "RECEIVED";
  }

  if (period.status === "LATE") {
    return "LATE";
  }

  return period.periodMonth <= demoToday ? "DUE" : "UPCOMING";
}

export function getDemoDashboardData(
  simulation?: DemoPaymentSimulation | null,
  createdLease?: DemoPropertyRecord | null,
  noteSimulation?: DemoNoteSimulation | null,
) {
  const properties = getRecords(simulation, createdLease, noteSimulation).map(
    dashboardPropertyFromRecord,
  );
  const needsAttention = properties.filter(
    (property) => property.billingPeriodRemainingCents > 0,
  );
  const allGood = properties.filter(
    (property) => property.billingPeriodRemainingCents === 0,
  );

  return {
    properties,
    needsAttention,
    allGood,
    summary: {
      billingPeriodMonth: demoBillingPeriod,
      collectedThisMonthCents: properties.reduce(
        (total, property) =>
          total +
          Math.max(
            (property.rentCents ?? 0) - property.billingPeriodRemainingCents,
            0,
          ),
        0,
      ),
      outstandingCents: properties.reduce(
        (total, property) => total + property.billingPeriodRemainingCents,
        0,
      ),
    },
  };
}

export function getDemoPropertyDetails(
  propertyId: string,
  simulation?: DemoPaymentSimulation | null,
  createdLease?: DemoPropertyRecord | null,
  noteSimulation?: DemoNoteSimulation | null,
): PropertyDetailData | null {
  const record = getRecords(simulation, createdLease, noteSimulation).find(
    (item) => item.id === propertyId,
  );

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    notes: null,
    activeLease: {
      id: record.leaseId,
      tenant: {
        id: `${record.id}-tenant`,
        name: record.tenantName,
        email: record.tenantEmail,
      },
      rentCents: record.rentCents,
      firstPeriodMonth: record.firstPeriodMonth ?? firstPeriodMonth,
      lastPeriodMonth:
        record.lastPeriodMonth === undefined
          ? lastPeriodMonth
          : record.lastPeriodMonth,
      notes: record.note || null,
      creditBalanceCents: record.creditBalanceCents,
      periods: record.periods.map((period) => ({
        id: period.id,
        periodMonth: period.periodMonth,
        amountDueCents: period.amountDueCents,
        status: periodStatus(period),
      })),
    },
    payments: record.payments.map((payment) => ({
      id: payment.id,
      receivedAt: payment.receivedAt,
      amountCents: payment.amountCents,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
    })),
  };
}

export function getDemoEmailCoverage() {
  const activeRecords = demoRecords.filter((record) =>
    record.periods.some(
      (period) => period.periodMonth.getTime() === demoBillingPeriod.getTime(),
    ),
  );

  return {
    activeCount: activeRecords.length,
    canReceiveCount: activeRecords.filter((record) => record.tenantEmail).length,
    missingEmail: activeRecords
      .filter((record) => !record.tenantEmail)
      .map((record) => ({
        propertyId: record.id,
        propertyName: record.name,
        tenantName: record.tenantName,
      })),
  };
}

export function getDemoEmailData(
  settings: EmailSettingsViewData = defaultEmailSettings,
  retriedLogIds: string[] = [],
) {
  const retriedLogs = new Set(retriedLogIds);

  return {
    settings,
    emailLogs: [
      {
        id: "demo-email-harbor",
        propertyId: "harbor-office",
        propertyName: "Harbor Office Suite 4",
        tenantName: "Maya Chen",
        subject: "Rent past due for Harbor Office Suite 4",
        toAddress: "maya@example.com",
        sentAt: new Date("2026-06-05T00:00:00.000Z"),
        triggerType: "LATE_NOTICE" as const,
        error: null,
      },
      {
        id: "demo-email-riverside",
        propertyId: "riverside-warehouse",
        propertyName: "Riverside Warehouse",
        tenantName: "Noah Patel",
        subject: "Rent reminder for Riverside Warehouse",
        toAddress: "noah@example.com",
        sentAt: new Date("2026-06-03T00:00:00.000Z"),
        triggerType: "RENT_REMINDER" as const,
        error: null,
      },
      {
        id: "demo-email-lakeview-failed",
        propertyId: "lakeview-retail",
        propertyName: "Lakeview Retail",
        tenantName: "Samira Ali",
        subject: "Rent past due for Lakeview Retail",
        toAddress: "samira@example.com",
        sentAt: new Date("2026-06-08T00:00:00.000Z"),
        triggerType: "LATE_NOTICE" as const,
        error: retriedLogs.has("demo-email-lakeview-failed")
          ? null
          : "Mailbox unavailable",
      },
    ],
  };
}
