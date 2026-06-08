"use client";

import {
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Mail,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type DemoProperty = {
  name: string;
  tenant: string;
  rent: string;
  nextDue: string;
  status: "Late" | "Due" | "Paid";
};

const startingProperties: DemoProperty[] = [
  {
    name: "Harbor Office Suite 4",
    tenant: "Northstar Design Co.",
    rent: "$4,000.00",
    nextDue: "Jun 1, 2026",
    status: "Late",
  },
  {
    name: "88 Market Street",
    tenant: "Juniper Accounting",
    rent: "$3,250.00",
    nextDue: "Jul 1, 2026",
    status: "Paid",
  },
  {
    name: "Riverside Warehouse",
    tenant: "Atlas Supply Group",
    rent: "$6,800.00",
    nextDue: "Jun 1, 2026",
    status: "Due",
  },
];

function StatusChip({ status }: { status: DemoProperty["status"] }) {
  const styles = {
    Late: "bg-red-50 text-red-700 ring-red-200",
    Due: "bg-amber-50 text-amber-700 ring-amber-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function DemoExperience() {
  const [properties, setProperties] = useState(startingProperties);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const lateCount = properties.filter(
    (property) => property.status === "Late" || property.status === "Due",
  ).length;
  const paymentLogged = properties[0].status === "Paid";

  function logDemoPayment() {
    setProperties((current) =>
      current.map((property, index) =>
        index === 0
          ? { ...property, nextDue: "Jul 1, 2026", status: "Paid" }
          : property,
      ),
    );
    setIsPaymentOpen(false);
    setShowSuccess(true);
  }

  function resetDemo() {
    setProperties(startingProperties);
    setShowSuccess(false);
    setIsPaymentOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <Link className="font-semibold tracking-tight text-zinc-950" href="/demo">
              Property Manager
            </Link>
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              Public demo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              onClick={resetDemo}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={15} />
              Reset
            </button>
            <Link
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              href="/login"
            >
              Owner sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="grid gap-6 rounded-2xl bg-zinc-950 px-6 py-8 text-white lg:grid-cols-[1.4fr_1fr] lg:px-10 lg:py-10">
          <div>
            <p className="text-sm font-medium text-blue-300">Explore without signing in</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              See which tenants paid, log rent, and catch problems quickly.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
              This is a safe sample portfolio. Try the payment flow below, then share
              what feels confusing, missing, or slower than the way you work today.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={21} />
              <div>
                <p className="font-medium">Your changes are temporary</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">
                  Nothing here touches the owner&apos;s real properties. Refreshing or
                  pressing Reset restores the sample data.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                Sample dashboard
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                The owner sees the portfolio&apos;s payment health in one place.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={() => setIsPaymentOpen(true)}
              type="button"
            >
              <CircleDollarSign aria-hidden="true" size={17} />
              Try logging a payment
            </button>
          </div>

          {showSuccess ? (
            <div className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="flex gap-2">
                <Check className="mt-0.5 shrink-0" size={16} />
                <p>
                  Payment logged. Harbor Office moved to Paid and its next due date
                  advanced to July.
                </p>
              </div>
              <button
                aria-label="Dismiss payment confirmation"
                onClick={() => setShowSuccess(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="text-sm font-medium text-zinc-500">Active properties</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">3</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="text-sm font-medium text-zinc-500">Payments this month</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">
                {paymentLogged ? 2 : 1}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="text-sm font-medium text-zinc-500">Needing attention</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{lateCount}</p>
            </div>
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Monthly rent</th>
                  <th className="px-4 py-3">Next due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {properties.map((property) => (
                  <tr key={property.name}>
                    <td className="px-4 py-4 font-medium text-zinc-950">
                      {property.name}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">{property.tenant}</td>
                    <td className="px-4 py-4 text-zinc-600">{property.rent}</td>
                    <td className="px-4 py-4 text-zinc-600">{property.nextDue}</td>
                    <td className="px-4 py-4">
                      <StatusChip status={property.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {properties.map((property) => (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4"
                key={property.name}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-zinc-950">{property.name}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{property.tenant}</p>
                  </div>
                  <StatusChip status={property.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">Monthly rent</p>
                    <p className="mt-1 font-medium">{property.rent}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Next due</p>
                    <p className="mt-1 font-medium">{property.nextDue}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-sm font-medium text-blue-700">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              Three jobs, no spreadsheet archaeology.
            </h2>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "1. Add the lease",
                copy: "Enter the property, tenant, monthly rent, and lease dates once. The app creates every monthly obligation.",
              },
              {
                icon: CircleDollarSign,
                title: "2. Log money received",
                copy: "Enter one payment amount. It automatically applies to the oldest unpaid months and carries over extra credit.",
              },
              {
                icon: Mail,
                title: "3. Follow up automatically",
                copy: "The dashboard flags late rent, while scheduled reminders and late notices handle routine tenant follow-up.",
              },
            ].map(({ icon: Icon, title, copy }) => (
              <article
                className="rounded-xl border border-zinc-200 bg-white p-6"
                key={title}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon aria-hidden="true" size={20} />
                </div>
                <h3 className="mt-5 font-semibold text-zinc-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-blue-700">Help shape it</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                What would make this useful in real life?
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                Send the owner your blunt reaction. Confusion is useful feedback.
              </p>
            </div>
            <ul className="grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
              {[
                "What would you expect to click next?",
                "What information is missing?",
                "Which task still feels too manual?",
                "What would stop you trusting the numbers?",
              ].map((question) => (
                <li
                  className="flex gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3"
                  key={question}
                >
                  <ArrowRight className="mt-0.5 shrink-0 text-blue-600" size={15} />
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {isPaymentOpen ? (
        <div
          aria-labelledby="demo-payment-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
        >
          <div className="flex min-h-full w-full flex-col bg-white p-5 sm:min-h-0 sm:max-w-lg sm:rounded-xl sm:p-6 sm:shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight text-zinc-950"
                  id="demo-payment-title"
                >
                  Log Payment
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  This sample payment covers June rent.
                </p>
              </div>
              <button
                aria-label="Close payment form"
                className="rounded-md px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-100"
                onClick={() => setIsPaymentOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="mt-6 grid flex-1 content-start gap-4">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Property
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-zinc-100 px-3 font-normal"
                  defaultValue="harbor"
                  disabled
                >
                  <option value="harbor">Harbor Office Suite 4</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Amount
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  defaultValue="4000.00"
                  readOnly
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Payment method
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
                  defaultValue="ACH"
                >
                  <option>Check</option>
                  <option>Wire</option>
                  <option>ACH</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="h-10 flex-1 rounded-md border border-zinc-300 text-sm font-medium text-zinc-800"
                onClick={() => setIsPaymentOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={logDemoPayment}
                type="button"
              >
                Log $4,000 payment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
