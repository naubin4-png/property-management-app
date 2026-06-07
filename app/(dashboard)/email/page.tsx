import { formatMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

import { saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900";

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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
        Email Settings
      </h1>
      <p className="mt-2 text-zinc-600">
        Configure reminder timing and the plain-text messages sent to tenants.
      </p>

      {saved === "1" ? (
        <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Email settings saved.
        </p>
      ) : null}

      <form action={saveEmailSettings} className="mt-8 space-y-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Email Timing</h2>
          <div className="mt-5 space-y-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium text-zinc-900">
                  Reminders Enabled
                </span>
                <span className="block text-sm text-zinc-500">
                  Master switch for all automated tenant email.
                </span>
              </span>
              <input
                className="size-5"
                defaultChecked={settings.reminderEnabled}
                name="reminderEnabled"
                type="checkbox"
              />
            </label>

            <div className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-[1fr_9rem]">
              <label className="flex items-start gap-3">
                <input
                  className="mt-0.5 size-5"
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
                  className={`${fieldClass} h-10`}
                  defaultValue={settings.daysBeforeReminder}
                  min="0"
                  name="daysBeforeReminder"
                  required
                  type="number"
                />
              </label>
            </div>

            <div className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-[1fr_9rem]">
              <label className="flex items-start gap-3">
                <input
                  className="mt-0.5 size-5"
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
                  className={`${fieldClass} h-10`}
                  defaultValue={settings.daysAfterLateNotice}
                  min="0"
                  name="daysAfterLateNotice"
                  required
                  type="number"
                />
              </label>
            </div>

            <label className="block max-w-xs border-t border-zinc-100 pt-5 text-sm font-medium text-zinc-800">
              Grace period (days)
              <input
                className={`${fieldClass} h-10`}
                defaultValue={settings.gracePeriodDays}
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

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Email Copy</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Supported placeholders: <code>{"{tenant_name}"}</code>,{" "}
            <code>{"{property_name}"}</code>, <code>{"{amount_due}"}</code>, and{" "}
            <code>{"{due_date}"}</code>.
          </p>
          <div className="mt-5 grid gap-5">
            <label className="text-sm font-medium text-zinc-800">
              Rent reminder subject
              <input
                className={`${fieldClass} h-11`}
                defaultValue={settings.reminderEmailSubject}
                name="reminderEmailSubject"
                required
              />
            </label>
            <label className="text-sm font-medium text-zinc-800">
              Rent reminder body
              <textarea
                className={`${fieldClass} min-h-36 py-3`}
                defaultValue={settings.reminderEmailBody}
                name="reminderEmailBody"
                required
              />
            </label>
            <label className="text-sm font-medium text-zinc-800">
              Late notice subject
              <input
                className={`${fieldClass} h-11`}
                defaultValue={settings.lateNoticeSubject}
                name="lateNoticeSubject"
                required
              />
            </label>
            <label className="text-sm font-medium text-zinc-800">
              Late notice body
              <textarea
                className={`${fieldClass} min-h-36 py-3`}
                defaultValue={settings.lateNoticeBody}
                name="lateNoticeBody"
                required
              />
            </label>
          </div>
          <button
            className="mt-6 h-11 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white"
            type="submit"
          >
            Save Email Settings
          </button>
        </section>
      </form>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-zinc-950">Recent Emails</h2>
        {emailLogs.length === 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            No reminder emails have been processed yet.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="divide-y divide-zinc-100">
              {emailLogs.map((log) => (
                <div
                  className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[9rem_1fr_1.5fr_5rem] sm:gap-4"
                  key={log.id}
                >
                  <span className="text-zinc-600">{formatMonth(log.sentAt)}</span>
                  <span className="break-all text-zinc-700">{log.toAddress}</span>
                  <span className="text-zinc-900">{log.subject}</span>
                  <span
                    className={
                      log.error
                        ? "font-medium text-red-700"
                        : "font-medium text-emerald-700"
                    }
                  >
                    {log.error ? "Failed" : "Sent"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
