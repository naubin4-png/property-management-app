import { signInWithGoogle } from "./actions";
import Link from "next/link";
import { safeAppDestination } from "@/lib/auth-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[.14em] text-zinc-500">Owner workspace</p>
        <h1 className="font-serif text-3xl italic tracking-tight">Property Manager</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to manage rent tracking and tenant emails.
        </p>

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signInWithGoogle} className="mt-6">
          <input
            name="next"
            type="hidden"
            value={safeAppDestination(next)}
          />
          <button
            autoFocus
            className="h-11 w-full rounded-md bg-zinc-900 text-sm font-medium text-[#d9ef85] transition-colors hover:bg-zinc-800"
            type="submit"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          Or
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <Link
          className="flex h-11 w-full items-center justify-center rounded-md bg-blue-50 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          href="/demo"
        >
          Explore the public demo
        </Link>
        <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
          No account required. Sample data only.
        </p>
      </div>
    </main>
  );
}
