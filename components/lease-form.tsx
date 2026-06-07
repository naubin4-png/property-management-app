"use client";

import { useState } from "react";

import { findTenantByEmail } from "@/app/(dashboard)/properties/[id]/leases/new/actions";

export function LeaseForm({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
}) {
  const [reuseTenantId, setReuseTenantId] = useState("");
  const [tenantMessage, setTenantMessage] = useState("");

  async function checkTenant(email: string) {
    const tenant = await findTenantByEmail(email);

    if (!tenant) {
      setReuseTenantId("");
      setTenantMessage("");
      return;
    }

    const reuse = window.confirm(
      `A tenant with this email already exists (${tenant.name}) - link this lease to that tenant?`,
    );
    setReuseTenantId(reuse ? tenant.id : "");
    setTenantMessage(
      reuse
        ? `This lease will use the existing tenant record for ${tenant.name}.`
        : "A separate tenant record will be created.",
    );
  }

  return (
    <form action={action} className="mt-8 space-y-6">
      <input name="reuseTenantId" type="hidden" value={reuseTenantId} />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Tenant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-800">
            Tenant Name
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
              name="tenantName"
              required
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Email
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
              name="tenantEmail"
              onBlur={(event) => void checkTenant(event.currentTarget.value)}
              required
              type="email"
            />
          </label>
        </div>
        {tenantMessage ? (
          <p className="mt-3 text-sm text-zinc-600">{tenantMessage}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Lease</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-800">
            First Rent Due
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
              name="firstPeriodMonth"
              required
              type="month"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Lease Ends
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
              name="lastPeriodMonth"
              required
              type="month"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 sm:col-span-2">
            Monthly Rent
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 font-normal outline-none focus:border-zinc-900"
              inputMode="decimal"
              min="0.01"
              name="rent"
              placeholder="4000.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 sm:col-span-2">
            Notes <span className="font-normal text-zinc-500">(optional)</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none focus:border-zinc-900"
              name="notes"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          type="submit"
        >
          Create Lease
        </button>
      </div>
    </form>
  );
}
