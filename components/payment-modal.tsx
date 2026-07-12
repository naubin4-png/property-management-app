"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
} from "react";

export type PaymentPropertyOption = {
  id: string;
  name: string;
  rentCents?: number | null;
  creditBalanceCents?: number;
  nextDueDate?: Date | string | null;
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
type PaymentActionState = { error: string | null };
type PaymentAction = (
  state: PaymentActionState,
  formData: FormData,
) => Promise<PaymentActionState>;
const demoAction: PaymentAction = async () => initialState;

function dateInputValue(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function PaymentModal({
  properties,
  action,
  selectedPropertyId,
  clientRequestId,
  closeHref,
  payment,
  returnHref,
  onClose,
  onDemoSubmit,
}: {
  properties: PaymentPropertyOption[];
  action?: PaymentAction;
  selectedPropertyId?: string;
  clientRequestId: string;
  closeHref: string;
  payment?: EditablePayment;
  returnHref?: string;
  onClose?: () => void;
  onDemoSubmit?: (formData: FormData) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    action ?? demoAction,
    initialState,
  );
  const [propertyId, setPropertyId] = useState(selectedPropertyId ?? "");
  const [amount, setAmount] = useState(
    payment ? (payment.amountCents / 100).toFixed(2) : "",
  );
  const propertyRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const selectedProperty = properties.find(
    (property) => property.id === propertyId,
  );
  const paymentSummary = useMemo(() => {
    const rentCents = selectedProperty?.rentCents ?? 0;
    const amountCents = Math.round(Number(amount) * 100);
    const existingCredit = selectedProperty?.creditBalanceCents ?? 0;

    if (!rentCents || !Number.isFinite(amountCents) || amountCents <= 0) {
      return null;
    }

    const availableCents = amountCents + existingCredit;
    const monthsCovered = Math.floor(availableCents / rentCents);
    const creditCents = availableCents % rentCents;
    let nextDue = "Not available";

    if (selectedProperty?.nextDueDate) {
      const nextDueDate = new Date(selectedProperty.nextDueDate);
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + monthsCovered);
      nextDue = nextDueDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    return {
      monthsCovered,
      nextDue,
      credit:
        creditCents > 0
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(creditCents / 100)
          : null,
    };
  }, [amount, selectedProperty]);

  function handleDemoSubmit(event: FormEvent<HTMLFormElement>) {
    if (!onDemoSubmit) {
      return;
    }

    event.preventDefault();
    onDemoSubmit(new FormData(event.currentTarget));
  }

  useEffect(() => {
    (payment || selectedPropertyId ? amountRef.current : propertyRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (onClose) {
        onClose();
      } else {
        window.location.href = closeHref;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHref, onClose, payment, selectedPropertyId]);

  function keepFieldVisible(event: FocusEvent<HTMLFormElement>) {
    window.setTimeout(() => {
      event.target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  const closeControl = onClose ? (
    <button
      aria-label="Close check form"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100"
      onClick={onClose}
      type="button"
    >
      ×
    </button>
  ) : (
    <Link
      aria-label="Close check form"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100"
      href={closeHref}
    >
      ×
    </Link>
  );

  return (
    <div
      aria-labelledby="payment-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <div className="flex h-[100dvh] w-full flex-col overflow-y-auto bg-white p-5 scroll-pb-32 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-xl sm:p-6 sm:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight text-zinc-950"
              id="payment-modal-title"
            >
              {payment ? "Edit Check" : "Add Check"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Payments apply automatically to the oldest unpaid rent.
            </p>
          </div>
          {closeControl}
        </div>

        <form
          action={formAction}
          className="mt-6 grid flex-1 content-start gap-4"
          onFocusCapture={keepFieldVisible}
          onSubmit={handleDemoSubmit}
        >
          <input
            name="clientRequestId"
            type="hidden"
            value={payment?.clientRequestId ?? clientRequestId}
          />
          <input name="returnHref" type="hidden" value={returnHref ?? closeHref} />

          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Space
            <select
              className="h-11 rounded-md border border-zinc-300 bg-white px-3 font-normal"
              defaultValue={selectedPropertyId ?? ""}
              disabled={Boolean(payment)}
              name={payment ? undefined : "propertyId"}
              onChange={(event) => setPropertyId(event.target.value)}
              ref={propertyRef}
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
                enterKeyHint="next"
                inputMode="decimal"
                min="0.01"
                name="amount"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                ref={amountRef}
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

          {paymentSummary ? (
            <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Covers {paymentSummary.monthsCovered}{" "}
              {paymentSummary.monthsCovered === 1 ? "month" : "months"}. Next
              due: {paymentSummary.nextDue}.
              {paymentSummary.credit
                ? ` Credit: ${paymentSummary.credit}.`
                : null}
            </p>
          ) : null}

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
            Notes
            <textarea
              className="min-h-11 resize-none rounded-md border border-zinc-300 px-3 py-2.5 font-normal transition-[min-height] focus:min-h-24"
              defaultValue={payment?.notes ?? ""}
              name="notes"
              rows={1}
            />
          </label>

          {state.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-3 pt-3 sm:mt-0">
            {onClose ? (
              <button
                className="inline-flex h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
            ) : (
              <Link
                className="inline-flex h-11 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
                href={closeHref}
              >
                Cancel
              </Link>
            )}
            <button
              className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving..." : payment ? "Save Check" : "Add Check"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const AddCheckModal = PaymentModal;
