"use client";

import { Menu, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type DemoStatus = "PAID" | "DUE" | "LATE";

type DemoProperty = {
  id: string;
  name: string;
  tenantName: string;
  rent: string;
  nextDueDate: string;
  status: DemoStatus;
};

const startingProperties: DemoProperty[] = [
  {
    id: "harbor-office",
    name: "Harbor Office Suite 4",
    tenantName: "Northstar Design Co.",
    rent: "$4000.00",
    nextDueDate: "Jun 1, 2026",
    status: "LATE",
  },
  {
    id: "riverside-warehouse",
    name: "Riverside Warehouse",
    tenantName: "Atlas Supply Group",
    rent: "$6800.00",
    nextDueDate: "Jun 1, 2026",
    status: "DUE",
  },
  {
    id: "market-street",
    name: "88 Market Street",
    tenantName: "Juniper Accounting",
    rent: "$3250.00",
    nextDueDate: "Jul 1, 2026",
    status: "PAID",
  },
];

const statusStyles: Record<DemoStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DUE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  LATE: "bg-red-50 text-red-700 ring-red-600/20",
};

const statusLabels: Record<DemoStatus, string> = {
  PAID: "Paid",
  DUE: "Due",
  LATE: "Late",
};

function StatusChip({ status }: { status: DemoStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function DemoPropertyList({
  properties,
  title,
  onLogPayment,
}: {
  properties: DemoProperty[];
  title: string;
  onLogPayment: (propertyId: string) => void;
}) {
  if (properties.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>

      <div className="mt-3 hidden overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Property Name</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Monthly Rent</th>
              <th className="px-4 py-3 font-medium">Next Due Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {properties.map((property) => (
              <tr className="hover:bg-zinc-50" key={property.id}>
                <td className="px-4 py-4 font-medium text-zinc-950">
                  {property.name}
                </td>
                <td className="px-4 py-4 text-zinc-600">{property.tenantName}</td>
                <td className="px-4 py-4 text-zinc-600">{property.rent}</td>
                <td className="px-4 py-4 text-zinc-600">{property.nextDueDate}</td>
                <td className="px-4 py-4">
                  <StatusChip status={property.status} />
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    aria-label={`Log payment for ${property.name}`}
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    onClick={() => onLogPayment(property.id)}
                    type="button"
                  >
                    <ReceiptText aria-hidden="true" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        {properties.map((property) => (
          <div
            className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm"
            key={property.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-zinc-950">{property.name}</p>
                <p className="mt-1 text-sm text-zinc-600">{property.tenantName}</p>
              </div>
              <StatusChip status={property.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Monthly rent</dt>
                <dd className="mt-1 font-medium text-zinc-900">{property.rent}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Next due</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {property.nextDueDate}
                </dd>
              </div>
            </dl>
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800"
              onClick={() => onLogPayment(property.id)}
              type="button"
            >
              <ReceiptText aria-hidden="true" size={16} />
              Log Payment
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DemoExperience() {
  const [properties, setProperties] = useState(startingProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const needsAttention = properties.filter(
    (property) => property.status === "LATE" || property.status === "DUE",
  );
  const allGood = properties.filter(
    (property) => property.status !== "LATE" && property.status !== "DUE",
  );
  const paymentsThisMonth = properties.filter(
    (property) => property.status === "PAID",
  ).length;

  function logPayment() {
    if (!selectedPropertyId) {
      return;
    }

    setProperties((current) =>
      current.map((property) =>
        property.id === selectedPropertyId
          ? {
              ...property,
              nextDueDate: "Jul 1, 2026",
              status: "PAID",
            }
          : property,
      ),
    );
    setSelectedPropertyId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
        Demo mode — sample data, nothing is saved
      </div>

      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link className="font-semibold tracking-tight text-zinc-950" href="/demo">
            Property Manager
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-2 md:flex"
          >
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              href="/demo"
            >
              Dashboard
            </Link>
            <button
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              type="button"
            >
              Email
            </button>
            <button
              className="ml-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              type="button"
            >
              + Add Property
            </button>
            <button
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={() => setSelectedPropertyId(properties[0].id)}
              type="button"
            >
              Log Payment
            </button>
            <Link
              className="ml-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
              href="/login"
            >
              Owner sign in
            </Link>
          </nav>

          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            {isMenuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>

        {isMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="space-y-1 border-t border-zinc-200 px-4 py-4 md:hidden"
          >
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              href="/demo"
            >
              Dashboard
            </Link>
            <button
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              type="button"
            >
              Email
            </button>
            <button
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-900"
              type="button"
            >
              + Add Property
            </button>
            <button
              className="block w-full rounded-md bg-zinc-900 px-3 py-2 text-left text-sm font-medium text-white"
              onClick={() => {
                setSelectedPropertyId(properties[0].id);
                setIsMenuOpen(false);
              }}
              type="button"
            >
              Log Payment
            </button>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-800"
              href="/login"
            >
              Owner sign in
            </Link>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Dashboard
          </h1>
          <p className="mt-2 text-zinc-600">Your rent portfolio at a glance.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-500">
              Total active properties
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {properties.length}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-500">
              Payments this month
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {paymentsThisMonth}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-500">Needing attention</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {needsAttention.length}
            </p>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          <DemoPropertyList
            onLogPayment={setSelectedPropertyId}
            properties={needsAttention}
            title="Needs Attention"
          />
          <DemoPropertyList
            onLogPayment={setSelectedPropertyId}
            properties={allGood}
            title="All Good"
          />
        </div>
      </main>

      {selectedPropertyId ? (
        <div
          aria-labelledby="payment-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
        >
          <div className="flex min-h-full w-full flex-col bg-white p-5 sm:min-h-0 sm:max-w-lg sm:rounded-xl sm:p-6 sm:shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight text-zinc-950"
                  id="payment-modal-title"
                >
                  Log Payment
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Payments apply automatically to the oldest unpaid rent.
                </p>
              </div>
              <button
                aria-label="Close payment form"
                className="rounded-md px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-100"
                onClick={() => setSelectedPropertyId(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <form
              className="mt-6 grid flex-1 content-start gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                logPayment();
              }}
            >
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Property
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                  value={selectedPropertyId}
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                  Amount
                  <input
                    className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                    defaultValue="4000.00"
                    min="0.01"
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                  Date Received
                  <input
                    className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                    defaultValue="2026-06-08"
                    required
                    type="date"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Payment Method
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
                  defaultValue=""
                >
                  <option value="">Select a method</option>
                  <option value="CHECK">Check</option>
                  <option value="WIRE">Wire</option>
                  <option value="ACH">ACH</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Reference #
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Notes
                <textarea
                  className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal"
                />
              </label>

              <div className="mt-2 flex gap-3">
                <button
                  className="h-10 flex-1 rounded-md border border-zinc-300 text-sm font-medium text-zinc-800"
                  onClick={() => setSelectedPropertyId(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-10 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
                  type="submit"
                >
                  Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
