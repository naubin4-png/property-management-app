"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updatePropertyDetails,
  type InlineEditState,
} from "@/app/(dashboard)/properties/[id]/actions";
import { formatMoney } from "@/lib/lease-math";
import { monthInputValue } from "@/lib/lease-periods";
import type { PropertyDetailData } from "@/lib/property-details";

const initialState: InlineEditState = { error: null, saved: false };

export function PropertyDetailsEditor({
  action: detailsAction,
  detail,
}: {
  action?: typeof updatePropertyDetails;
  detail: PropertyDetailData;
}) {
  const lease = detail.activeLease;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    (detailsAction ?? updatePropertyDetails).bind(
      null,
      detail.id,
      lease?.id ?? "",
    ),
    initialState,
  );

  useEffect(() => {
    if (open) {
      firstFieldRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (state.saved) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.saved]);

  if (!lease) {
    return null;
  }

  if (!open) {
    return (
      <button
        className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        onClick={() => setOpen(true)}
        type="button"
      >
        Edit details
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-4 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const propertyName = String(formData.get("propertyName") ?? "").trim();
        const tenantName = String(formData.get("tenantName") ?? "").trim();
        const rent = Number(formData.get("rent"));
        const end = String(formData.get("lastPeriodMonth") ?? "");
        const first = monthInputValue(lease.firstPeriodMonth);

        if (!propertyName || !tenantName) {
          event.preventDefault();
          setClientError("Property and tenant names are required.");
        } else if (!Number.isFinite(rent) || rent <= 0) {
          event.preventDefault();
          setClientError("Enter a valid monthly rent.");
        } else if (end && end < first) {
          event.preventDefault();
          setClientError("Lease end cannot be before tracking starts.");
        } else {
          setClientError(null);
        }
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-zinc-950">Edit details</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Update the property, tenant, lease terms, and note in one place.
        </p>
        {lease.tenant.leaseUseCount > 1 ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This tenant is connected to {lease.tenant.leaseUseCount} leases.
            Changing their name or email updates every use of this tenant.
          </p>
        ) : null}
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
        Property or unit name
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
          defaultValue={detail.name}
          enterKeyHint="next"
          name="propertyName"
          ref={firstFieldRef}
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          Tenant name
          <input
            className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
            defaultValue={lease.tenant.name}
            enterKeyHint="next"
            name="tenantName"
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          Tenant email (optional)
          <input
            className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
            defaultValue={lease.tenant.email ?? ""}
            enterKeyHint="next"
            name="tenantEmail"
            type="email"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          Track rent from
          <input
            className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 font-normal text-zinc-500"
            readOnly
            value={monthInputValue(lease.firstPeriodMonth)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          Lease ends (optional)
          <input
            className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
            defaultValue={
              lease.lastPeriodMonth ? monthInputValue(lease.lastPeriodMonth) : ""
            }
            min={monthInputValue(lease.firstPeriodMonth)}
            name="lastPeriodMonth"
            type="month"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          Monthly rent
          <input
            className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
            defaultValue={formatMoney(lease.rentCents)}
            inputMode="decimal"
            min="0.01"
            name="rent"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>

      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
        Shortening a lease only removes unpaid future rent periods. Paid or
        payment-linked history is never removed silently.
      </p>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
        Note
        <textarea
          className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal"
          defaultValue={lease.notes ?? ""}
          maxLength={1000}
          name="notes"
          placeholder="Add a short note for this active lease"
        />
      </label>

      {clientError || state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {clientError || state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save details"}
        </button>
      </div>
    </form>
  );
}
