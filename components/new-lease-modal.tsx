"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createLeaseInline,
  findTenantByEmail,
  type InlineEditState,
} from "@/app/(dashboard)/properties/[id]/actions";

const initialState: InlineEditState = { error: null, saved: false };

export function NewLeaseModal({
  closeHref,
  propertyId,
  propertyName,
}: {
  closeHref: string;
  propertyId: string;
  propertyName: string;
}) {
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [reuseTenantId, setReuseTenantId] = useState("");
  const [tenantMessage, setTenantMessage] = useState("");
  const [state, action, pending] = useActionState(
    createLeaseInline.bind(null, propertyId),
    initialState,
  );

  useEffect(() => {
    firstFieldRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHref, router]);

  useEffect(() => {
    if (state.saved) {
      router.push(closeHref);
      router.refresh();
    }
  }, [closeHref, router, state.saved]);

  async function checkTenant(email: string) {
    const tenant = await findTenantByEmail(email);

    if (!tenant) {
      setReuseTenantId("");
      setTenantMessage("");
      return;
    }

    const reuse = window.confirm(
      `A tenant with this email already exists (${tenant.name}). Use that tenant?`,
    );
    setReuseTenantId(reuse ? tenant.id : "");
    setTenantMessage(
      reuse
        ? `Using the existing tenant record for ${tenant.name}.`
        : "A separate tenant record will be created.",
    );
  }

  return (
    <div
      aria-labelledby="new-lease-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <div className="flex h-[100dvh] w-full flex-col overflow-y-auto bg-white p-5 scroll-pb-32 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:rounded-2xl sm:p-6 sm:shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight text-zinc-950"
              id="new-lease-title"
            >
              New Lease
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{propertyName}</p>
          </div>
          <Link
            aria-label="Close new lease form"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100"
            href={closeHref}
          >
            ×
          </Link>
        </div>

        <form action={action} className="mt-5 grid gap-4">
          <input name="reuseTenantId" type="hidden" value={reuseTenantId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Tenant name
              <input
                className="h-11 rounded-lg border border-zinc-300 px-3 font-normal"
                enterKeyHint="next"
                name="tenantName"
                ref={firstFieldRef}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Tenant email
              <input
                className="h-11 rounded-lg border border-zinc-300 px-3 font-normal"
                enterKeyHint="next"
                name="tenantEmail"
                onBlur={(event) => void checkTenant(event.currentTarget.value)}
                required
                type="email"
              />
            </label>
          </div>
          {tenantMessage ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              {tenantMessage}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              First rent due
              <input
                className="h-11 rounded-lg border border-zinc-300 px-3 font-normal"
                name="firstPeriodMonth"
                required
                type="month"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
              Lease ends
              <input
                className="h-11 rounded-lg border border-zinc-300 px-3 font-normal"
                name="lastPeriodMonth"
                required
                type="month"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Monthly rent
            <input
              className="h-11 rounded-lg border border-zinc-300 px-3 font-normal"
              inputMode="decimal"
              min="0.01"
              name="rent"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
            Notes
            <textarea
              className="min-h-24 rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              maxLength={1000}
              name="notes"
            />
          </label>

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-800"
              href={closeHref}
            >
              Cancel
            </Link>
            <button
              className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating..." : "Create Lease"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
