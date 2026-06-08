"use client";

import { useActionState, useRef, useState } from "react";

type AddPropertyActionState = { error: string | null };
type AddPropertyAction = (
  state: AddPropertyActionState,
  formData: FormData,
) => Promise<AddPropertyActionState>;

const initialState: AddPropertyActionState = { error: null };
const demoAction: AddPropertyAction = async () => initialState;

export type DemoPropertyInput = {
  propertyName: string;
  tenantName: string;
  rentCents: number;
  firstPeriodMonth: string;
};

export function AddPropertyModal({
  closeHref,
  action,
  onClose,
  onDemoCreate,
}: {
  closeHref?: string;
  action?: AddPropertyAction;
  onClose?: () => void;
  onDemoCreate?: (input: DemoPropertyInput) => void;
}) {
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    action ?? demoAction,
    initialState,
  );

  function close() {
    if (onClose) {
      onClose();
      return;
    }
    window.location.href = closeHref ?? "/";
  }

  return (
    <div
      aria-labelledby="add-property-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <div className="flex min-h-full w-full flex-col bg-white p-5 sm:min-h-0 sm:max-w-xl sm:rounded-xl sm:p-6 sm:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight text-zinc-950"
              id="add-property-modal-title"
            >
              Add Property
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Step {step} of 2
            </p>
          </div>
          <button
            aria-label="Close property form"
            className="rounded-md px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-100"
            onClick={close}
            type="button"
          >
            ×
          </button>
        </div>

        <form
          action={onDemoCreate ? undefined : formAction}
          className="mt-6 grid flex-1 content-start gap-4"
          ref={formRef}
          onSubmit={
            onDemoCreate
              ? (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const rent = Number(
                    String(formData.get("rent") ?? "").replace(/[$,]/g, ""),
                  );
                  onDemoCreate({
                    propertyName: String(formData.get("propertyName") ?? ""),
                    tenantName: String(formData.get("tenantName") ?? ""),
                    rentCents: Math.round(rent * 100),
                    firstPeriodMonth: String(
                      formData.get("firstPeriodMonth") ?? "",
                    ),
                  });
                }
              : undefined
          }
        >
          <div className={step === 1 ? "grid gap-4" : "hidden"}>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Property name
              <input
                autoFocus
                className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                name="propertyName"
                placeholder="e.g. 123 Main Street"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Notes (optional)
              <textarea
                className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal"
                name="propertyNotes"
              />
            </label>
          </div>

          <div className={step === 2 ? "grid gap-4" : "hidden"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Tenant name
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  name="tenantName"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Tenant email
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  name="tenantEmail"
                  required
                  type="email"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                First rent due
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  name="firstPeriodMonth"
                  required
                  type="month"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Lease ends
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  name="lastPeriodMonth"
                  required
                  type="month"
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Monthly rent
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                min="0.01"
                name="rent"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Lease notes (optional)
              <textarea
                className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal"
                name="leaseNotes"
              />
            </label>
          </div>

          {state.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-3 pt-3 sm:mt-0">
            {step === 1 ? (
              <>
                <button
                  className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
                  onClick={close}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
                  onClick={() => {
                    const propertyName = formRef.current?.elements.namedItem(
                      "propertyName",
                    );
                    if (
                      propertyName instanceof HTMLInputElement &&
                      !propertyName.reportValidity()
                    ) {
                      return;
                    }
                    setStep(2);
                  }}
                  type="button"
                >
                  Next
                </button>
              </>
            ) : (
              <>
                <button
                  className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Creating..." : "Create Property"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
