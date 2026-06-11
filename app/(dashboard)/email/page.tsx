import Link from "next/link";

import { formatMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

import { saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, settings, emailLogs] = await Promise.all([
    searchParams,
    getSettings(),
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Email
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Reminder timing, message copy, and recent delivery activity.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          href="/"
        >
          Dashboard
        </Link>
      </header>

      {saved === "1" ? (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Email settings saved.
        </p>
      ) : null}

      <form action={saveEmailSettings} className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Timing</h2>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-[1fr_9rem] sm:items-center">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  className="size-5 shrink-0"
                  defaultChecked={settings.sendBeforeDue}
                  name="sendBeforeDue"
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">
                    Send reminder before due date
                  </span>
                  <span className="block text-sm text-zinc-500">
                    Send once for each pending rent period.
                  </span>
                </span>
              </label>
              <label className="text-sm font-medium text-zinc-800">
                Days before
                <input
                  className={`${fieldClass} h-11`}
                  defaultValue={settings.daysBeforeReminder}
                  inputMode="numeric"
                  min="0"
                  name="daysBeforeReminder"
                  required
                  type="number"
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-[1fr_9rem] sm:items-center">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  className="size-5 shrink-0"
                  defaultChecked={settings.sendAfterDue}
                  name="sendAfterDue"
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">
                    Send late notice after due date
                  </span>
                  <span className="block text-sm text-zinc-500">
                    Send once for pending or late rent.
                  </span>
                </span>
              </label>
              <label className="text-sm font-medium text-zinc-800">
                Days after
                <input
                  className={`${fieldClass} h-11`}
                  defaultValue={settings.daysAfterLateNotice}
                  inputMode="numeric"
                  min="0"
                  name="daysAfterLateNotice"
                  required
                  type="number"
                />
              </label>
            </div>

            <label className="block rounded-xl bg-zinc-50 p-4 text-sm font-medium text-zinc-800 sm:max-w-sm">
              Grace period (days)
              <input
                className={`${fieldClass} h-11`}
                defaultValue={settings.gracePeriodDays}
                inputMode="numeric"
                min="0"
                name="gracePeriodDays"
                required
                type="number"
              />
              <span className="mt-1.5 block font-normal text-zinc-500">
                Pending rent becomes late after this many days.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Message copy</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Supported placeholders: <code>{"{tenant_name}"}</code>,{" "}
            <code>{"{property_name}"}</code>, <code>{"{amount_due}"}</code>, and{" "}
            <code>{"{due_date}"}</code>.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 rounded-xl bg-zinc-50 p-4">
              <h3 className="font-semibold text-zinc-900">Rent reminder</h3>
              <label className="text-sm font-medium text-zinc-800">
                Subject
                <input
                  className={`${fieldClass} h-11`}
                  defaultValue={settings.reminderEmailSubject}
                  name="reminderEmailSubject"
                  required
                />
              </label>
              <label className="text-sm font-medium text-zinc-800">
                Body
                <textarea
                  className={`${fieldClass} min-h-32 py-3`}
                  defaultValue={settings.reminderEmailBody}
                  name="reminderEmailBody"
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 rounded-xl bg-zinc-50 p-4">
              <h3 className="font-semibold text-zinc-900">Late notice</h3>
              <label className="text-sm font-medium text-zinc-800">
                Subject
                <input
                  className={`${fieldClass} h-11`}
                  defaultValue={settings.lateNoticeSubject}
                  name="lateNoticeSubject"
                  required
                />
              </label>
              <label className="text-sm font-medium text-zinc-800">
                Body
                <textarea
                  className={`${fieldClass} min-h-32 py-3`}
                  defaultValue={settings.lateNoticeBody}
                  name="lateNoticeBody"
                  required
                />
              </label>
            </div>
          </div>
          <button
            className="mt-6 h-11 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white"
            type="submit"
          >
            Save Email Settings
          </button>
        </section>
      </form>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-950">Recent activity</h2>
        {emailLogs.length === 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            No reminder emails have been processed yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {emailLogs.map((log) => (
                <div
                  className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm"
                  key={log.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-zinc-950">{log.subject}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                        log.error
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {log.error ? "Failed" : "Sent"}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-zinc-600">{log.toAddress}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatMonth(log.sentAt)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
