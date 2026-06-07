import Link from "next/link";

import { createProperty } from "./actions";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <Link className="text-sm font-medium text-zinc-600 hover:text-zinc-950" href="/">
          Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
          Add Property
        </h1>
        <p className="mt-2 text-zinc-600">
          Create the property first, then add its tenant and lease.
        </p>
      </div>

      <form
        action={createProperty}
        className="mt-8 space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div>
          <label className="text-sm font-medium text-zinc-800" htmlFor="name">
            Name
          </label>
          <input
            autoFocus
            className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
            id="name"
            name="name"
            placeholder="e.g. 123 Main Street"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-800" htmlFor="notes">
            Notes <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            className="mt-1 min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            id="notes"
            name="notes"
            placeholder="Access details, building notes, or anything else useful."
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            href="/"
          >
            Cancel
          </Link>
          <button
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Create Property
          </button>
        </div>
      </form>
    </main>
  );
}
