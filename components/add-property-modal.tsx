"use client";

import {
  useActionState,
  useEffect,
  type FocusEvent,
} from "react";

type AddPropertyActionState = { error: string | null };
type AddPropertyAction = (
  state: AddPropertyActionState,
  formData: FormData,
) => Promise<AddPropertyActionState>;

const initialState: AddPropertyActionState = { error: null };

export function AddPropertyModal({
  closeHref,
  action,
  onClose,
}: {
  closeHref?: string;
  action: AddPropertyAction;
  onClose?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const defaultTrackingMonth = new Date().toISOString().slice(0, 7);

  function close() {
    if (onClose) {
      onClose();
      return;
    }
    window.location.href = closeHref ?? "/";
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (onClose) {
        onClose();
      } else {
        window.location.href = closeHref ?? "/";
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHref, onClose]);

  function keepFieldVisible(event: FocusEvent<HTMLFormElement>) {
    window.setTimeout(() => {
      event.target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  return (
    <div
      aria-labelledby="add-property-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <div className="flex h-[100dvh] w-full flex-col overflow-y-auto bg-white p-5 scroll-pb-32 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:rounded-xl sm:p-6 sm:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight text-zinc-950"
              id="add-property-modal-title"
            >
              Add lease
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Add the property, tenant, and rent terms.
            </p>
          </div>
          <button
            aria-label="Close add lease form"
            className="inline-flex size-11 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100"
            onClick={close}
            type="button"
          >
            ×
          </button>
        </div>

        <form
          action={formAction}
          className="mt-6 grid flex-1 content-start gap-4"
          onFocusCapture={keepFieldVisible}
        >
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Property or unit name
              <input
                autoFocus
                className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                enterKeyHint="next"
                name="propertyName"
                placeholder="e.g. 123 Main Street"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Tenant name
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  enterKeyHint="next"
                  name="tenantName"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Tenant email (optional)
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  enterKeyHint="next"
                  name="tenantEmail"
                  type="email"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Track rent from
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  defaultValue={defaultTrackingMonth}
                  name="firstPeriodMonth"
                  required
                  type="month"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
                Lease ends (optional)
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                  name="lastPeriodMonth"
                  type="month"
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Monthly rent
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 font-normal"
                enterKeyHint="done"
                inputMode="decimal"
                min="0.01"
                name="rent"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>

          {state.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-3 pt-3 sm:mt-0">
            <button
              className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
              onClick={close}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Creating..." : "Create lease"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
