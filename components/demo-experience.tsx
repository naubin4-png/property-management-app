"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  AddPropertyModal,
  type DemoPropertyInput,
} from "@/components/add-property-modal";
import { TopBar } from "@/components/dashboard-nav";
import { DashboardView } from "@/components/dashboard-view";
import {
  AddCheckModal,
  type PaymentPropertyOption,
} from "@/components/payment-modal";
import { PropertyDetailContent } from "@/components/property-detail-content";
import { PropertyPanel } from "@/components/property-panel";
import type { DashboardProperty } from "@/lib/dashboard";
import { formatMoney, formatMonth } from "@/lib/lease-math";
import type { PropertyDetailData } from "@/lib/property-details";
import { defaultEmailSettings } from "@/lib/settings";

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
    id: "lakeview-retail",
    name: "Lakeview Retail",
    leaseId: "lakeview-lease",
    rentCents: 520000,
    nextDueDate: new Date("2026-06-01T00:00:00.000Z"),
    status: "LATE",
    hasActiveLease: true,
    dashboardNote: "Waiting on the tenant's updated payment date",
    latestEmail: {
      label: "Late notice",
      sentAt: new Date("2026-06-08T00:00:00.000Z"),
    },
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
    amountOwedCents: 0,
    creditBalanceCents: 25000,
  },
];

function nextMonth(date: Date, count = 1) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + count);
  return result;
}

function demoDetails(
  property: DashboardProperty,
  extraPayments: PropertyDetailData["payments"] = [],
): PropertyDetailData {
  const firstPeriodMonth = new Date("2026-01-01T00:00:00.000Z");
  const nextDueDate =
    property.nextDueDate ?? new Date("2026-07-01T00:00:00.000Z");
  const upcomingDate =
    property.amountOwedCents > 0 ? nextMonth(nextDueDate) : nextDueDate;
  const tenantNames: Record<string, [string, string]> = {
    "harbor-office": ["Maya Chen", "maya@example.com"],
    "riverside-warehouse": ["Noah Williams", "noah@example.com"],
    "market-street": ["Avery Johnson", "avery@example.com"],
    "lakeview-retail": ["Samira Patel", "samira@example.com"],
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
        receivedAt:
          property.id === "market-street" || property.id === "cedar-studio"
            ? new Date("2026-06-03T00:00:00.000Z")
            : new Date("2026-05-03T00:00:00.000Z"),
        amountCents: property.rentCents ?? 0,
        paymentMethod: "ACH",
        paymentReference: null,
      },
      ...extraPayments,
    ],
  };
}

export function DemoExperience({
  initialEmailPropertyId,
  initialIsEmailView = false,
}: {
  initialEmailPropertyId?: string;
  initialIsEmailView?: boolean;
}) {
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
  const [extraPayments, setExtraPayments] = useState<
    Record<string, PropertyDetailData["payments"]>
  >({});

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
  const selectedEmailProperty =
    properties.find((property) => property.id === initialEmailPropertyId) ??
    needsAttention[0] ??
    properties[0];

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
    setExtraPayments((current) => ({
      ...current,
      [propertyId]: [
        {
          id: `demo-payment-${Date.now()}`,
          receivedAt: new Date(
            `${String(formData.get("receivedAt") ?? "2026-06-11")}T00:00:00.000Z`,
          ),
          amountCents,
          paymentMethod: String(formData.get("paymentMethod") || "") || null,
          paymentReference: null,
        },
        ...(current[propertyId] ?? []),
      ],
    }));
    setIsPaymentOpen(false);
  }

  function addDemoProperty(input: DemoPropertyInput) {
    const id = `demo-${Date.now()}`;
    const firstDue = new Date(`${input.firstPeriodMonth}-01T00:00:00.000Z`);
    const isCurrentlyDue = firstDue <= new Date("2026-06-11T00:00:00.000Z");
    setProperties((current) => [
      ...current,
      {
        id,
        name: input.propertyName,
        leaseId: `${id}-lease`,
        rentCents: input.rentCents,
        nextDueDate: firstDue,
        status: isCurrentlyDue ? "DUE" : "PAID",
        hasActiveLease: true,
        dashboardNote: "",
        latestEmail: null,
        amountOwedCents: isCurrentlyDue ? input.rentCents : 0,
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
        emailHref="/demo?email=1"
        activeHref={initialIsEmailView ? "/demo?email=1" : "/demo"}
        onAddProperty={() => setIsAddPropertyOpen(true)}
        onAddCheck={() => openPayment()}
        ownerSignInHref="/login"
      />
      {initialIsEmailView && selectedEmailProperty ? (
        <DemoEmailView property={demoDetails(selectedEmailProperty)} />
      ) : (
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
      )}
      {selectedDetail && !initialIsEmailView ? (
        <PropertyPanel
          closeHref="/demo"
          onClose={() => setDetailPropertyId(null)}
          title={selectedDetail.name}
        >
          <PropertyDetailContent
            detail={demoDetails(
              selectedDetail,
              extraPayments[selectedDetail.id],
            )}
            onLogPayment={() => openPayment(selectedDetail.id)}
            paymentReturnHref="/demo"
            showInlineEditing={false}
            showPaymentActions={false}
            tenantEmailHref={`/demo?email=1&property=${selectedDetail.id}`}
          />
        </PropertyPanel>
      ) : null}
      {isPaymentOpen ? (
        <AddCheckModal
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

function DemoEmailView({ property }: { property: PropertyDetailData }) {
  const lease = property.activeLease;
  const tenantName = lease?.tenant.name ?? "Sample Tenant";
  const tenantEmail = lease?.tenant.email ?? "tenant@example.com";
  const amountDue = lease?.periods.find(
    (period) => period.status === "LATE" || period.status === "DUE",
  );
  const dueDate = amountDue?.periodMonth ?? lease?.periods[0]?.periodMonth;
  const amountDueText = amountDue
    ? `$${formatMoney(amountDue.amountDueCents)}`
    : "$0.00";
  const previewSubject = defaultEmailSettings.lateNoticeSubject.replaceAll(
    "{property_name}",
    property.name,
  );
  const previewBody = defaultEmailSettings.lateNoticeBody
    .replaceAll("{tenant_name}", tenantName)
    .replaceAll("{property_name}", property.name)
    .replaceAll("{amount_due}", amountDueText)
    .replaceAll("{due_date}", dueDate ? formatMonth(dueDate) : "the due date");

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Email
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Demo reminder settings and tenant email preview.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          href="/demo"
        >
          Dashboard
        </Link>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Selected tenant
        </p>
        <div className="mt-3 rounded-xl bg-zinc-50 p-4">
          <p className="font-semibold text-zinc-950">{tenantName}</p>
          <p className="mt-1 text-sm text-zinc-600">{tenantEmail}</p>
          <p className="mt-2 text-sm text-zinc-600">{property.name}</p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-zinc-950">Timing</h2>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-[1fr_9rem] sm:items-center">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Send reminder before due date
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Send once for each pending rent period.
              </p>
            </div>
            <p className="text-sm font-semibold text-zinc-950">
              {defaultEmailSettings.daysBeforeReminder} days before
            </p>
          </div>
          <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-[1fr_9rem] sm:items-center">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Send late notice after due date
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Send once for pending or late rent.
              </p>
            </div>
            <p className="text-sm font-semibold text-zinc-950">
              {defaultEmailSettings.daysAfterLateNotice} days after
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-zinc-950">Message preview</h2>
        <div className="mt-4 rounded-xl bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            To
          </p>
          <p className="mt-1 break-all text-sm font-medium text-zinc-950">
            {tenantEmail}
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-950">
            {previewSubject}
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Body
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-zinc-700">
            {previewBody}
          </p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-lg font-semibold text-zinc-950">Recent activity</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-zinc-950">{previewSubject}</p>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                Sent
              </span>
            </div>
            <p className="mt-2 break-all text-zinc-600">{tenantEmail}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {property.name} · sample demo activity
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
