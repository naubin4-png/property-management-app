import { signInWithEmail, signInWithGoogle } from "./actions";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Property Manager</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to manage rent tracking and reminders.
        </p>

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signInWithEmail} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-800" htmlFor="email">
              Email
            </label>
            <input
              autoFocus
              className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
              enterKeyHint="next"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-800" htmlFor="password">
              Password
            </label>
            <input
              className="mt-1 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
              enterKeyHint="done"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="h-11 w-full rounded-md bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <form action={signInWithGoogle} className="mt-3">
          <button
            className="h-11 w-full rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
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
