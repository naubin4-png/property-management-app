import { AlertCircle, CheckCircle2, ChevronDown, MailWarning } from "lucide-react";
import type { ReactNode } from "react";

import { formatMonth } from "@/lib/lease-math";
import { supportedEmailPlaceholders } from "@/lib/email-reminders";

export type EmailSettingsViewData = {
  sendBeforeDue: boolean;
  sendAfterDue: boolean;
  daysBeforeReminder: number;
  gracePeriodDays: number;
  reminderEmailSubject: string;
  reminderEmailBody: string;
  lateNoticeSubject: string;
  lateNoticeBody: string;
};

export type EmailCoverageViewData = {
  activeCount: number;
  canReceiveCount: number;
  missingEmail: {
    propertyId: string;
    propertyName: string;
    tenantName: string;
  }[];
};

export type EmailLogViewData = {
  id: string;
  propertyName: string | null;
  tenantName: string | null;
  subject: string;
  toAddress: string;
  sentAt: Date;
  triggerType: "RENT_REMINDER" | "LATE_NOTICE";
  error: string | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

function messageType(triggerType: EmailLogViewData["triggerType"]) {
  return triggerType === "RENT_REMINDER" ? "Rent reminder" : "Late notice";
}

function PlaceholderHelp() {
  return (
    <p className="text-xs leading-5 text-zinc-500">
      Supported placeholders:{" "}
      {supportedEmailPlaceholders.map((placeholder, index) => (
        <span key={placeholder}>
          <code>{placeholder}</code>
          {index < supportedEmailPlaceholders.length - 1 ? ", " : ""}
        </span>
      ))}
      .
    </p>
  );
}

function CustomizeMessage({
  bodyName,
  bodyValue,
  children,
  subjectName,
  subjectValue,
  title,
}: {
  bodyName: string;
  bodyValue: string;
  children: ReactNode;
  subjectName: string;
  subjectValue: string;
  title: string;
}) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-900">
        <span>{title}</span>
        <ChevronDown aria-hidden className="size-4 text-zinc-500" />
      </summary>
      <div className="grid gap-4 border-t border-zinc-100 px-4 py-4">
        {children}
        <PlaceholderHelp />
        <label className="text-sm font-medium text-zinc-800">
          Subject
          <input
            className={`${fieldClass} h-11`}
            defaultValue={subjectValue}
            name={subjectName}
            required
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Body
          <textarea
            className={`${fieldClass} min-h-32 py-3`}
            defaultValue={bodyValue}
            name={bodyName}
            required
          />
        </label>
      </div>
    </details>
  );
}

export function EmailSettingsView({
  action,
  coverage,
  emailLogs,
  filteredPropertyId,
  filteredPropertyName,
  retryAction,
  saved,
  settings,
}: {
  action: (formData: FormData) => Promise<void>;
  coverage: EmailCoverageViewData;
  emailLogs: EmailLogViewData[];
  filteredPropertyId?: string | null;
  filteredPropertyName?: string | null;
  retryAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  settings: EmailSettingsViewData;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Reminders
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Control rent reminders, late notices, and tenant email coverage.
        </p>
      </header>

      {saved ? (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Reminder settings saved.
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Email coverage
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {coverage.canReceiveCount} of {coverage.activeCount} active tenants
              can receive reminders.
            </p>
          </div>
          {coverage.missingEmail.length > 0 ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span className="font-semibold">
                {coverage.missingEmail.length} missing email
              </span>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              All active tenants covered
            </div>
          )}
        </div>
        {coverage.missingEmail.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {coverage.missingEmail.map((item) => (
              <div
                className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm"
                key={`${item.propertyId}:${item.tenantName}`}
              >
                <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <p>
                  <span className="font-medium text-zinc-950">
                    {item.propertyName}
                  </span>
                  <span className="text-zinc-600">, {item.tenantName}</span>
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <form action={action} className="mt-5 space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Rent reminder</h2>
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
                    Send rent reminder
                  </span>
                  <span className="block text-sm text-zinc-500">
                    Sends once before unpaid rent is due.
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
            <CustomizeMessage
              bodyName="reminderEmailBody"
              bodyValue={settings.reminderEmailBody}
              subjectName="reminderEmailSubject"
              subjectValue={settings.reminderEmailSubject}
              title="Customize message"
            >
              <p className="text-sm text-zinc-600">
                This message is used for upcoming unpaid rent.
              </p>
            </CustomizeMessage>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Late rent</h2>
          <div className="mt-4 grid gap-3">
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
                Unpaid rent becomes late after this many days. Late notices use
                the same timing.
              </span>
            </label>

            <label className="flex min-h-11 items-center gap-3 rounded-xl bg-zinc-50 p-4">
              <input
                className="size-5 shrink-0"
                defaultChecked={settings.sendAfterDue}
                name="sendAfterDue"
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900">
                  Send late notice when rent becomes late
                </span>
                <span className="block text-sm text-zinc-500">
                  Sends once for unpaid rent at the end of the grace period.
                </span>
              </span>
            </label>

            <CustomizeMessage
              bodyName="lateNoticeBody"
              bodyValue={settings.lateNoticeBody}
              subjectName="lateNoticeSubject"
              subjectValue={settings.lateNoticeSubject}
              title="Customize message"
            >
              <p className="text-sm text-zinc-600">
                This message is used only once rent is late.
              </p>
            </CustomizeMessage>
          </div>
        </section>

        <button
          className="h-11 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white"
          type="submit"
        >
          Save reminder settings
        </button>
      </form>

      <section className="mt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Delivery history
            </h2>
            <p className="text-sm text-zinc-600">
              {filteredPropertyName
                ? `Showing recent deliveries for ${filteredPropertyName}.`
                : "Recent reminder and late-notice deliveries."}
            </p>
          </div>
        </div>
        {emailLogs.length === 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            No reminder deliveries yet.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="hidden grid-cols-[8rem_1fr_9rem_8rem] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid">
              <span>Date</span>
              <span>Context</span>
              <span>Message</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {emailLogs.map((log) => (
                <div
                  className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr_9rem_8rem] sm:gap-4"
                  key={log.id}
                >
                  <div className="text-zinc-600">{formatMonth(log.sentAt)}</div>
                  <div>
                    <p className="font-medium text-zinc-950">
                      {log.propertyName ?? "Unknown property"}
                    </p>
                    <p className="break-all text-xs text-zinc-500">
                      {log.tenantName ?? log.toAddress}
                    </p>
                  </div>
                  <div className="text-zinc-700">{messageType(log.triggerType)}</div>
                  <div className="flex flex-wrap items-center gap-2 sm:block">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        log.error
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {log.error ? (
                        <AlertCircle aria-hidden className="size-3.5" />
                      ) : (
                        <CheckCircle2 aria-hidden className="size-3.5" />
                      )}
                      {log.error ? "Failed" : "Sent"}
                    </span>
                    {log.error && retryAction ? (
                      <form action={retryAction} className="inline-block sm:mt-2">
                        <input name="logId" type="hidden" value={log.id} />
                        {filteredPropertyId ? (
                          <input
                            name="property"
                            type="hidden"
                            value={filteredPropertyId}
                          />
                        ) : null}
                        <button
                          className="min-h-8 rounded-full border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
                          type="submit"
                        >
                          Retry
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
