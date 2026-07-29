import Link from "next/link";

import { signOut } from "@/app/logout/actions";

export default function InvitationRequiredPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          A workspace invitation is required
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          You signed in successfully, but this Google account does not have an
          active Property Manager invitation. Ask the person who invited you to
          confirm the Gmail address on the invitation.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form action={signOut}>
            <button
              className="h-11 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white"
              type="submit"
            >
              Sign out
            </button>
          </form>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium"
            href="/demo"
          >
            Explore the public demo
          </Link>
        </div>
      </section>
    </main>
  );
}
