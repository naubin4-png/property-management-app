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
import type { DashboardProperty } from "@/lib/dashboard";

const startingProperties: DashboardProperty[] = [
  {
    id: "harbor-office",
    name: "Harbor Office Suite 4",
    leaseId: "harbor-lease",
    tenantName: "Northstar Design Co.",
    rentCents: 400000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "LATE",
    hasActiveLease: true,
    dashboardNote: "Call about the remaining balance",
    latestEmail: {
      label: "Late notice",
      sentAt: new Date("2026-06-05T00:00:00.000Z"),
    },
    creditBalanceCents: 0,
  },
  {
    id: "riverside-warehouse",
    name: "Riverside Warehouse",
    leaseId: "riverside-lease",
    tenantName: "Atlas Supply Group",
    rentCents: 680000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "DUE",
    hasActiveLease: true,
    dashboardNote: "",
    latestEmail: {
      label: "Reminder sent",
      sentAt: new Date("2026-06-03T00:00:00.000Z"),
    },
    creditBalanceCents: 50000,
  },
  {
    id: "market-street",
    name: "88 Market Street",
    leaseId: "market-lease",
    tenantName: "Juniper Accounting",
    rentCents: 325000,
    nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
    status: "PAID",
    hasActiveLease: true,
    dashboardNote: "Renewal conversation in August",
    latestEmail: null,
    creditBalanceCents: 0,
  },
  {
    id: "cedar-studio",
    name: "Cedar Street Studio",
    leaseId: "cedar-lease",
    tenantName: "Marlow Photo",
    rentCents: 275000,
    nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
    status: "PAID",
    hasActiveLease: true,
    dashboardNote: "",
    latestEmail: null,
    creditBalanceCents: 25000,
  },
];

function nextMonth(date: Date, count = 1) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + count);
  return result;
}

export function DemoExperience() {
  const [properties, setProperties] =
    useState<DashboardProperty[]>(startingProperties);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<
    string | undefined
  >();

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
      activeProperties: properties.filter((property) => property.hasActiveLease)
        .length,
      paymentsThisMonth: properties.filter(
        (property) => property.status === "PAID",
      ).length,
      needingAttention: needsAttention.length,
    }),
    [needsAttention.length, properties],
  );

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
        return {
          ...property,
          nextDueDate: nextMonth(property.nextDueDate, monthsCovered),
          status: monthsCovered > 0 ? "PAID" : property.status,
          creditBalanceCents: availableCents % property.rentCents,
        };
      }),
    );
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
        tenantName: input.tenantName,
        rentCents: input.rentCents,
        nextDueDate: new Date(`${input.firstPeriodMonth}-01T00:00:00.000Z`),
        status: "DUE",
        hasActiveLease: true,
        dashboardNote: "",
        latestEmail: null,
        creditBalanceCents: 0,
      },
    ]);
    setIsAddPropertyOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
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
        onLogPayment={openPayment}
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
