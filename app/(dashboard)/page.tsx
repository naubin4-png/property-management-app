import Link from "next/link";

import { PropertyList } from "@/components/property-list";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { properties, needsAttention, allGood, summary } = await getDashboardData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Dashboard</h1>
        <p className="mt-2 text-zinc-600">Your rent portfolio at a glance.</p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total active properties</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {summary.activeProperties}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Payments this month</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {summary.paymentsThisMonth}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Needing attention</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {summary.needingAttention}
          </p>
        </div>
      </section>

      {properties.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Add your first property
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Start by adding a property, then attach its tenant and lease details.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            href="/properties/new"
          >
            Add Your First Property
          </Link>
        </section>
      ) : (
        <div className="mt-8 space-y-8">
          <PropertyList properties={needsAttention} title="Needs Attention" />
          <PropertyList properties={allGood} title="All Good" />
        </div>
      )}
    </main>
  );
}
