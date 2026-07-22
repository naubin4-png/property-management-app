import type { DashboardProperty } from "@/lib/dashboard";
import type { PropertyDetailData } from "@/lib/property-details";
import { defaultEmailSettings } from "@/lib/settings";

export const demoProperties: DashboardProperty[] = [
  {
    id: "harbor-office",
    name: "Harbor Office Suite 4",
    leaseId: "harbor-lease",
    rentCents: 400000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "LATE",
    hasActiveLease: true,
    dashboardNote: "Call about the remaining balance",
    latestEmail: {
      label: "Late notice sent",
      sentAt: new Date("2026-06-05T00:00:00.000Z"),
    },
    advancePayment: null,
    amountOwedCents: 400000,
    creditBalanceCents: 0,
  },
  {
    id: "riverside-warehouse",
    name: "Riverside Warehouse",
    leaseId: "riverside-lease",
    rentCents: 680000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "DUE",
    hasActiveLease: true,
    dashboardNote: "Tenant confirmed both invoices are processing",
    latestEmail: {
      label: "Reminder sent",
      sentAt: new Date("2026-06-03T00:00:00.000Z"),
    },
    advancePayment: null,
    amountOwedCents: 1360000,
    creditBalanceCents: 50000,
  },
  {
    id: "market-street",
    name: "88 Market Street",
    leaseId: "market-lease",
    rentCents: 325000,
    nextDueDate: new Date("2026-09-01T00:00:00.000Z"),
    status: "PAID",
    hasActiveLease: true,
    dashboardNote: "Renewal conversation in August",
    latestEmail: null,
    advancePayment: {
      monthsPaid: 3,
      paidAt: new Date("2026-06-04T00:00:00.000Z"),
    },
    amountOwedCents: 0,
    creditBalanceCents: 0,
  },
  {
    id: "lakeview-retail",
    name: "Lakeview Retail",
    leaseId: "lakeview-lease",
    rentCents: 520000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "LATE",
    hasActiveLease: true,
    dashboardNote: "Waiting on the tenant's updated payment date",
    latestEmail: {
      label: "Late notice sent",
      sentAt: new Date("2026-06-08T00:00:00.000Z"),
    },
    advancePayment: null,
    amountOwedCents: 520000,
    creditBalanceCents: 0,
  },
  {
    id: "cedar-studio",
    name: "Cedar Street Studio",
    leaseId: "cedar-lease",
    rentCents: 275000,
    nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
    status: "PAID",
    hasActiveLease: true,
    dashboardNote: "",
    latestEmail: null,
    advancePayment: null,
    amountOwedCents: 0,
    creditBalanceCents: 25000,
  },
];

const tenantNames: Record<string, [string, string]> = {
  "harbor-office": ["Maya Chen", "maya@example.com"],
  "riverside-warehouse": ["Noah Williams", "noah@example.com"],
  "market-street": ["Avery Johnson", "avery@example.com"],
  "lakeview-retail": ["Samira Patel", "samira@example.com"],
  "cedar-studio": ["Jordan Lee", "jordan@example.com"],
};

function nextMonth(date: Date, count = 1) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + count);
  return result;
}

export function getDemoDashboardData() {
  const needsAttention = demoProperties.filter(
    (property) => property.status === "LATE",
  );
  const allGood = demoProperties.filter(
    (property) => property.status !== "LATE",
  );

  return {
    properties: demoProperties,
    needsAttention,
    allGood,
    summary: {
      collectedThisMonthCents: 600000,
      outstandingCents: 2280000,
    },
  };
}

export function getDemoPropertyDetails(
  propertyId: string,
): PropertyDetailData | null {
  const property = demoProperties.find((item) => item.id === propertyId);

  if (!property) {
    return null;
  }

  const firstPeriodMonth = new Date("2026-01-01T00:00:00.000Z");
  const nextDueDate =
    property.nextDueDate ?? new Date("2026-07-01T00:00:00.000Z");
  const upcomingDate =
    property.amountOwedCents > 0 ? nextMonth(nextDueDate) : nextDueDate;
  const [tenantName, tenantEmail] = tenantNames[property.id] ?? [
    "Sample Tenant",
    "tenant@example.com",
  ];
  const periods = [
    {
      id: `${property.id}-paid`,
      periodMonth: new Date("2026-05-01T00:00:00.000Z"),
      amountDueCents: property.rentCents ?? 0,
      status: "RECEIVED" as const,
    },
    ...(property.amountOwedCents > 0
      ? [
          {
            id: `${property.id}-due`,
            periodMonth: new Date("2026-06-01T00:00:00.000Z"),
            amountDueCents: property.amountOwedCents,
            status:
              property.status === "LATE"
                ? ("LATE" as const)
                : ("DUE" as const),
          },
        ]
      : []),
    {
      id: `${property.id}-upcoming`,
      periodMonth: upcomingDate,
      amountDueCents: property.rentCents ?? 0,
      status: "UPCOMING" as const,
    },
  ];

  return {
    id: property.id,
    name: property.name,
    notes: property.dashboardNote,
    activeLease: property.leaseId
      ? {
          id: property.leaseId,
          tenant: {
            id: `${property.id}-tenant`,
            name: tenantName,
            email: tenantEmail,
          },
          rentCents: property.rentCents ?? 0,
          firstPeriodMonth,
          lastPeriodMonth: new Date("2027-12-01T00:00:00.000Z"),
          notes: "Demo lease details can be edited safely.",
          dashboardNote: property.dashboardNote,
          creditBalanceCents: property.creditBalanceCents,
          periods,
        }
      : null,
    payments: [
      {
        id: `${property.id}-payment`,
        receivedAt:
          property.id === "market-street" || property.id === "cedar-studio"
            ? new Date("2026-06-03T00:00:00.000Z")
            : new Date("2026-05-03T00:00:00.000Z"),
        amountCents: property.rentCents ?? 0,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  };
}

export function getDemoEmailData() {
  return {
    settings: defaultEmailSettings,
    emailLogs: [
      {
        id: "demo-email-harbor",
        subject: "Rent past due for Harbor Office Suite 4",
        toAddress: "maya@example.com",
        sentAt: new Date("2026-06-05T00:00:00.000Z"),
        error: null,
      },
      {
        id: "demo-email-riverside",
        subject: "Rent reminder for Riverside Warehouse",
        toAddress: "noah@example.com",
        sentAt: new Date("2026-06-03T00:00:00.000Z"),
        error: null,
      },
    ],
  };
}
