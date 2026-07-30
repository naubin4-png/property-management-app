"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import { deletePayment } from "@/app/(dashboard)/payments/actions";
import { updatePropertyDetails } from "@/app/(dashboard)/properties/[id]/actions";
import {
  updateLeaseNote,
  type InlineEditState,
} from "@/app/(dashboard)/properties/[id]/actions";
import { PropertyDetailsEditor } from "@/components/property-inline-editors";
import {
  formatShortDate,
  formatShortMonth,
  type RentLedgerRow,
} from "@/lib/rent-ledger";
import type { PropertyDetailData } from "@/lib/property-details";

type DetailsEditorProps = ComponentProps<typeof PropertyDetailsEditor>;
type NoteAction = typeof updateLeaseNote;

const badgeClass = {
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  UNPAID: "bg-amber-50 text-amber-800 ring-amber-200",
};

function currency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function methodLabel(method: string | null) {
  if (!method) {
    return "No method";
  }
  return method.charAt(0) + method.slice(1).toLowerCase();
}

function PaymentDeleteForm({
  action,
  paymentId,
  propertyId,
  returnHref,
}: {
  action: typeof deletePayment;
  paymentId: string;
  propertyId: string;
  returnHref: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="inline-flex min-h-11 items-center text-sm font-medium text-red-700 hover:text-red-900"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
      <p>
        Deleting recalculates rent and may make covered periods unpaid again.
      </p>
      <form
        action={action.bind(null, paymentId, propertyId, returnHref)}
        className="flex flex-wrap gap-2"
      >
        <button
          className="inline-flex min-h-11 items-center rounded-md bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-800"
          type="submit"
        >
          Confirm delete
        </button>
        <button
          className="inline-flex min-h-11 items-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-800"
          onClick={() => setConfirming(false)}
          type="button"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

function LeaseNote({
  action,
  leaseId,
  note,
  propertyId,
}: {
  action: NoteAction;
  leaseId: string;
  note: string | null;
  propertyId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, pending] = useActionState(
    action.bind(null, propertyId, leaseId),
    { error: null, saved: false } satisfies InlineEditState,
  );

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (state.saved) {
      setEditing(false);
      router.refresh();
    }
  }, [router, state.saved]);

  if (!editing) {
    return (
      <button
        className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
        onClick={() => setEditing(true)}
        type="button"
      >
        {note?.trim() || "Add a note"}
        <span className="ml-2 text-xs font-medium text-zinc-500">Edit</span>
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-300 bg-white p-3 shadow-sm"
    >
      <textarea
        className="min-h-24 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        defaultValue={note ?? ""}
        maxLength={1000}
        name="notes"
        placeholder="Add a short note for this lease"
        ref={inputRef}
      />
      {state.error ? (
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <button
          className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium"
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save note"}
        </button>
      </div>
    </form>
  );
}

function LedgerRow({
  deleteAction,
  propertyId,
  returnHref,
  row,
  showActions,
}: {
  deleteAction: typeof deletePayment;
  propertyId: string;
  returnHref: string;
  row: RentLedgerRow;
  showActions: boolean;
}) {
  return (
    <details className="group px-4 py-3 text-sm">
      <summary className="grid min-h-11 cursor-pointer list-none gap-1 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
        <span className="font-medium text-zinc-950">{row.activity}</span>
        <span className="text-zinc-600">{row.context}</span>
      </summary>
      {row.payments.length > 0 ? (
        <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-3">
          {row.payments.map((payment) => {
            const editHref = `${returnHref}${returnHref.includes("?") ? "&" : "?"}editPayment=${payment.id}`;
            return (
              <div
                className="flex flex-col gap-2 rounded-lg bg-zinc-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                key={payment.id}
              >
                <p className="text-zinc-600">
                  {currency(payment.amountCents)} received{" "}
                  {formatShortDate(payment.receivedAt)}
                  {payment.paymentMethod
                    ? ` · ${methodLabel(payment.paymentMethod)}`
                    : ""}
                </p>
                {showActions ? (
                  <div className="flex items-center gap-3">
                    <Link
                      className="inline-flex min-h-11 items-center font-medium text-zinc-700"
                      href={editHref}
                    >
                      Edit payment
                    </Link>
                    <PaymentDeleteForm
                      action={deleteAction}
                      paymentId={payment.id}
                      propertyId={propertyId}
                      returnHref={returnHref}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="pb-1 text-zinc-500">No payment recorded for this month.</p>
      )}
    </details>
  );
}

export function PropertyDetailContent({
  detail,
  detailsAction,
  noteAction = updateLeaseNote,
  logPaymentHref,
  newLeaseHref,
  onLogPayment,
  paymentDeleteAction = deletePayment,
  paymentReturnHref,
  remindersHref,
  showPaymentActions = true,
  showInlineEditing = true,
}: {
  detail: PropertyDetailData;
  detailsAction?: DetailsEditorProps["action"];
  noteAction?: NoteAction;
  logPaymentHref?: string;
  newLeaseHref?: string;
  onLogPayment?: () => void;
  paymentDeleteAction?: typeof deletePayment;
  paymentReturnHref?: string;
  remindersHref?: string;
  showPaymentActions?: boolean;
  showInlineEditing?: boolean;
}) {
  const lease = detail.activeLease;
  const [showFullLedger, setShowFullLedger] = useState(false);

  if (!lease) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {detail.name}
          </h1>
        </header>
        <section className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
          <h2 className="font-semibold text-zinc-950">No active lease</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Add a tenant, rent amount, and lease dates to track payments.
          </p>
          {newLeaseHref ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
              href={newLeaseHref}
            >
              New Lease
            </Link>
          ) : null}
        </section>
      </div>
    );
  }

  const currentRent = lease.currentRent;
  const badge = currentRent?.badge ?? "PAID";
  const visibleLedger = showFullLedger ? lease.ledger : lease.ledger.slice(0, 8);
  const returnHref = paymentReturnHref ?? `/properties/${detail.id}`;

  return (
    <div className="px-4 py-5 sm:px-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
                {detail.name}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass[badge]}`}
              >
                {badge === "PAID" ? "Paid" : "Unpaid"}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              {currentRent
                ? `${formatShortMonth(currentRent.billingMonth)} rent, ${currentRent.supportingText}`
                : "No rent is tracked for the displayed billing month."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onLogPayment ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={onLogPayment}
                type="button"
              >
                Record payment
              </button>
            ) : logPaymentHref ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                href={logPaymentHref}
              >
                Record payment
              </Link>
            ) : null}
            {showInlineEditing ? (
              <PropertyDetailsEditor
                action={detailsAction ?? updatePropertyDetails}
                detail={detail}
              />
            ) : null}
          </div>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
          <p className="text-sm font-medium text-zinc-700">
            {currentRent
              ? formatShortMonth(currentRent.billingMonth)
              : "Not tracked this month"}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            {currentRent?.badge === "UNPAID"
              ? `${currency(currentRent.amountRemainingCents)} remaining`
              : currentRent?.paidAt
                ? `Paid ${formatShortDate(currentRent.paidAt)}`
                : "Paid"}
          </p>
          {currentRent?.successfulEmailActivity ? (
            <p className="mt-2 text-sm text-zinc-600">
              {currentRent.successfulEmailActivity.label}{" "}
              {formatShortDate(currentRent.successfulEmailActivity.sentAt)}
            </p>
          ) : null}
          </div>
          <div>
          <p className="font-semibold text-zinc-950">
            {lease.tenant.name}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {lease.tenant.email ?? "No email on file"}
          </p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-zinc-700 hover:text-zinc-950"
            href={remindersHref ?? `/email?property=${detail.id}`}
          >
            Tenant email settings
          </Link>
          </div>
        </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 text-sm">
            <div>
              <dt className="text-zinc-500">Monthly rent</dt>
              <dd className="mt-0.5 font-semibold text-zinc-950">
                {currency(lease.rentCents)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Lease end</dt>
              <dd className="mt-0.5 font-semibold text-zinc-950">
                {lease.lastPeriodMonth
                  ? formatShortMonth(lease.lastPeriodMonth)
                  : "Open-ended"}
              </dd>
            </div>
          </dl>
      </section>

      <div className="mt-4">
        <LeaseNote
          action={noteAction}
          leaseId={lease.id}
          note={lease.notes}
          propertyId={detail.id}
        />
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Monthly rent history
            </h2>
          </div>
          {lease.ledger.length > 8 ? (
            <button
              className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-700 hover:text-zinc-950"
              onClick={() => setShowFullLedger((current) => !current)}
              type="button"
            >
              {showFullLedger ? "Show recent" : "View full history"}
            </button>
          ) : null}
        </div>

        <div className="mt-3 divide-y divide-zinc-100 overflow-visible rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {visibleLedger.map((row) => (
            <LedgerRow
              deleteAction={paymentDeleteAction}
              key={row.id}
              propertyId={detail.id}
              returnHref={returnHref}
              row={row}
              showActions={showPaymentActions}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
