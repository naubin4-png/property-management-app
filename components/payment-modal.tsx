"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  editPayment,
  logPayment,
  type PaymentActionState,
} from "@/app/(dashboard)/payments/actions";

export type PaymentPropertyOption = {
  id: string;
  name: string;
};

export type EditablePayment = {
  id: string;
  amountCents: number;
  receivedAt: Date;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  clientRequestId: string;
};

const initialState: PaymentActionState = { error: null };

function dateInputValue(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function PaymentModal({
  properties,
  selectedPropertyId,
  clientRequestId,
  closeHref,
  payment,
}: {
  properties: PaymentPropertyOption[];
  selectedPropertyId?: string;
  clientRequestId: string;
  closeHref: string;
  payment?: EditablePayment;
}) {
  const action = payment ? editPayment.bind(null, payment.id) : logPayment;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
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
              {payment ? "Edit Payment" : "Log Payment"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Payments apply automatically to the oldest unpaid rent.
            </p>
          </div>
          <Link
            aria-label="Close payment form"
            className="rounded-md px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-100"
            href={closeHref}
          >
            ×
          </Link>
        </div>

        <form action={formAction} className="mt-6 grid flex-1 content-start gap-4">
          <input
            name="clientRequestId"
            type="hidden"
            value={payment?.clientRequestId ?? clientRequestId}
          />

          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Property
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
              defaultValue={selectedPropertyId ?? ""}
              disabled={Boolean(payment)}
              name={payment ? undefined : "propertyId"}
              required
            >
              <option disabled value="">
                Select a property
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          {payment ? (
            <input name="propertyId" type="hidden" value={selectedPropertyId} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Amount
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                defaultValue={
                  payment ? (payment.amountCents / 100).toFixed(2) : ""
                }
                min="0.01"
                name="amount"
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
                defaultValue={dateInputValue(payment?.receivedAt ?? new Date())}
                name="receivedAt"
                required
                type="date"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Payment Method
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
              defaultValue={payment?.paymentMethod ?? ""}
              name="paymentMethod"
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
              defaultValue={payment?.paymentReference ?? ""}
              name="paymentReference"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Notes
            <textarea
              className="min-h-24 rounded-md border border-zinc-300 p-3 font-normal"
              defaultValue={payment?.notes ?? ""}
              name="notes"
            />
          </label>

          {state.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-3 pt-3 sm:mt-0">
            <Link
              className="inline-flex h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
              href={closeHref}
            >
              Cancel
            </Link>
            <button
              className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving..." : payment ? "Save Payment" : "Log Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
