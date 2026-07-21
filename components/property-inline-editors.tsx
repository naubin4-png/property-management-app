"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateLeaseInline,
  updateTenant,
  type InlineEditState,
} from "@/app/(dashboard)/properties/[id]/actions";
import { formatMoney } from "@/lib/lease-math";
import { monthInputValue } from "@/lib/lease-periods";
import type { PropertyDetailData } from "@/lib/property-details";

const initialState: InlineEditState = { error: null, saved: false };

function nextMonthValue(date: Date) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  return monthInputValue(next);
}

export function TenantInlineEditor({
  action: tenantAction,
  propertyId,
  tenant,
}: {
  action?: typeof updateTenant;
  propertyId: string;
  tenant: NonNullable<PropertyDetailData["activeLease"]>["tenant"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    (tenantAction ?? updateTenant).bind(null, propertyId, tenant.id),
    initialState,
  );

  useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (state.saved) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.saved]);

  if (!open) {
    return (
      <button
        className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950"
        onClick={() => setOpen(true)}
        type="button"
      >
        Edit tenant
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 grid gap-3 border-t border-zinc-100 pt-3">
      <label className="grid gap-1 text-xs font-medium text-zinc-600">
        Tenant name
        <input
          className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-normal text-zinc-900"
          defaultValue={tenant.name}
          enterKeyHint="next"
          name="tenantName"
          ref={nameRef}
          required
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-zinc-600">
        Tenant email
        <input
          className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-normal text-zinc-900"
          defaultValue={tenant.email}
          enterKeyHint="done"
          name="tenantEmail"
          required
          type="email"
        />
      </label>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
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
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export function LeaseInlineEditor({
  action: leaseAction,
  lease,
  propertyId,
}: {
  action?: typeof updateLeaseInline;
  lease: NonNullable<PropertyDetailData["activeLease"]>;
  propertyId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    (leaseAction ?? updateLeaseInline).bind(null, propertyId, lease.id),
    initialState,
  );
  const minimumEnd = nextMonthValue(lease.lastPeriodMonth);

  useEffect(() => {
    if (open) {
      endRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (state.saved) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.saved]);

  if (!open) {
    return (
      <button
        className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950"
        onClick={() => setOpen(true)}
        type="button"
      >
        Edit lease
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mb-3 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const end = String(formData.get("lastPeriodMonth") ?? "");
        const rent = Number(formData.get("rent"));
        if (end < minimumEnd) {
          event.preventDefault();
          setClientError("Choose a month after the current lease end.");
        } else if (!Number.isFinite(rent) || rent <= 0) {
          event.preventDefault();
          setClientError("Enter a valid monthly rent.");
        } else {
          setClientError(null);
        }
      }}
    >
      <p className="text-xs leading-5 text-zinc-500">
        Lease edits must extend the end month. New rent applies only to future
        periods.
      </p>
      <label className="grid gap-1 text-xs font-medium text-zinc-600">
        Extend through
        <input
          className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-normal text-zinc-900"
          defaultValue={minimumEnd}
          min={minimumEnd}
          name="lastPeriodMonth"
          ref={endRef}
          required
          type="month"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-zinc-600">
        Monthly rent
        <input
          className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-normal text-zinc-900"
          defaultValue={formatMoney(lease.rentCents)}
          inputMode="decimal"
          min="0.01"
          name="rent"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-zinc-600">
        Notes
        <textarea
          className="min-h-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900"
          defaultValue={lease.notes ?? ""}
          maxLength={1000}
          name="notes"
        />
      </label>
      {clientError || state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {clientError || state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
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
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
