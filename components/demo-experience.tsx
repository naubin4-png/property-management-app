"use client";

import { useMemo, useState } from "react";

import {
  AddPropertyModal,
  type DemoPropertyInput,
} from "@/components/add-property-modal";
import { TopBar } from "@/components/dashboard-nav";
import { DashboardView } from "@/components/dashboard-view";
import {
  LogPaymentModal,
  type PaymentPropertyOption,
} from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import type { DashboardProperty } from "@/lib/dashboard";
import type { PropertyDetailData } from "@/lib/property-details";

const startingProperties: DashboardProperty[] = [
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
      label: "Late notice",
      sentAt: new Date("2026-06-05T00:00:00.000Z"),
    },
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
    amountOwedCents: 0,
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
    amountOwedCents: 0,
    creditBalanceCents: 25000,
  },
];

function nextMonth(date: Date, count = 1) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + count);
  return result;
}

function demoDetails(property: DashboardProperty): PropertyDetailData {
  const firstPeriodMonth = new Date("2026-01-01T00:00:00.000Z");
  const nextDueDate =
    property.nextDueDate ?? new Date("2026-07-01T00:00:00.000Z");
  const upcomingDate =
    property.amountOwedCents > 0 ? nextMonth(nextDueDate) : nextDueDate;
  const tenantNames: Record<string, [string, string]> = {
    "harbor-office": ["Maya Chen", "maya@example.com"],
    "riverside-warehouse": ["Noah Williams", "noah@example.com"],
    "market-street": ["Avery Johnson", "avery@example.com"],
    "cedar-studio": ["Jordan Lee", "jordan@example.com"],
  };
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
            status: property.status === "LATE" ? ("LATE" as const) : ("DUE" as const),
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
          notes: null,
          dashboardNote: property.dashboardNote,
          creditBalanceCents: property.creditBalanceCents,
          periods,
        }
      : null,
    payments: [
      {
        id: `${property.id}-payment`,
        receivedAt: new Date("2026-05-03T00:00:00.000Z"),
        amountCents: property.rentCents ?? 0,
        paymentMethod: "ACH",
        paymentReference: null,
      },
    ],
  };
}

export function DemoExperience() {
  const [properties, setProperties] =
    useState<DashboardProperty[]>(startingProperties);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [collectedThisMonthCents, setCollectedThisMonthCents] =
    useState(600000);
  const [selectedPropertyId, setSelectedPropertyId] = useState<
    string | undefined
  >();
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);

  const needsAttention = properties.filter(
    (property) => property.status === "LATE" || property.status === "DUE",
  );
  const allGood = properties.filter(
    (property) => property.status !== "LATE" && property.status !== "DUE",
  );
  const paymentProperties: PaymentPropertyOption[] = properties.map(
    (property) => ({
      id: property.id,
      name: property.name,
      rentCents: property.rentCents,
      creditBalanceCents: property.creditBalanceCents,
      nextDueDate: property.nextDueDate,
    }),
  );
  const summary = useMemo(
    () => ({
      collectedThisMonthCents,
      outstandingCents: properties.reduce(
        (total, property) => total + property.amountOwedCents,
        0,
      ),
    }),
    [collectedThisMonthCents, properties],
  );
  const selectedDetail = detailPropertyId
    ? properties.find((property) => property.id === detailPropertyId)
    : null;

  function openPayment(propertyId?: string) {
    setSelectedPropertyId(propertyId);
    setIsPaymentOpen(true);
  }

  function logDemoPayment(formData: FormData) {
    const propertyId = String(formData.get("propertyId") ?? "");
    const amountCents = Math.round(Number(formData.get("amount")) * 100);

    setProperties((current) =>
      current.map((property) => {
        if (
          property.id !== propertyId ||
          !property.rentCents ||
          !property.nextDueDate
        ) {
          return property;
        }

        const availableCents = amountCents + property.creditBalanceCents;
        const monthsCovered = Math.floor(availableCents / property.rentCents);
        const amountAppliedCents = Math.min(
          monthsCovered * property.rentCents,
          property.amountOwedCents,
        );
        const amountOwedCents = property.amountOwedCents - amountAppliedCents;
        return {
          ...property,
          nextDueDate: nextMonth(property.nextDueDate, monthsCovered),
          status: amountOwedCents === 0 ? "PAID" : property.status,
          amountOwedCents,
          creditBalanceCents: availableCents % property.rentCents,
        };
      }),
    );
    setCollectedThisMonthCents((current) => current + amountCents);
    setIsPaymentOpen(false);
  }

  function addDemoProperty(input: DemoPropertyInput) {
    const id = `demo-${Date.now()}`;
    setProperties((current) => [
      ...current,
      {
        id,
        name: input.propertyName,
        leaseId: `${id}-lease`,
        rentCents: input.rentCents,
        nextDueDate: new Date(`${input.firstPeriodMonth}-01T00:00:00.000Z`),
        status: "DUE",
        hasActiveLease: true,
        dashboardNote: "",
        latestEmail: null,
        amountOwedCents: input.rentCents,
        creditBalanceCents: 0,
      },
    ]);
    setIsAddPropertyOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
        Demo mode — sample data, nothing is saved
      </div>
      <TopBar
        dashboardHref="/demo"
        emailHref="/demo"
        onAddProperty={() => setIsAddPropertyOpen(true)}
        onLogPayment={() => openPayment()}
        ownerSignInHref="/login"
      />
      <DashboardView
        allGood={allGood}
        needsAttention={needsAttention}
        onAddProperty={() => setIsAddPropertyOpen(true)}
        onOpenProperty={setDetailPropertyId}
        onSaveNote={(leaseId, note) => {
          setProperties((current) =>
            current.map((property) =>
              property.leaseId === leaseId
                ? { ...property, dashboardNote: note }
                : property,
            ),
          );
        }}
        propertyBaseHref={null}
        summary={summary}
      />
      {selectedDetail ? (
        <PropertyPanel
          closeHref="/demo"
          onClose={() => setDetailPropertyId(null)}
          title={selectedDetail.name}
        >
          <PropertyDetailContent
            detail={demoDetails(selectedDetail)}
            onLogPayment={() => openPayment(selectedDetail.id)}
            showPaymentActions={false}
          />
        </PropertyPanel>
      ) : null}
      {isPaymentOpen ? (
        <LogPaymentModal
          clientRequestId={`demo-${Date.now()}`}
          closeHref="/demo"
          onClose={() => setIsPaymentOpen(false)}
          onDemoSubmit={logDemoPayment}
          properties={paymentProperties}
          selectedPropertyId={selectedPropertyId}
        />
      ) : null}
      {isAddPropertyOpen ? (
        <AddPropertyModal
          onClose={() => setIsAddPropertyOpen(false)}
          onDemoCreate={addDemoProperty}
        />
      ) : null}
    </div>
  );
}
