import { AlertCircle, CheckCircle2, ChevronDown, MailWarning } from "lucide-react";
import Link from "next/link";
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
  replyToEmail?: string;
  timezone?: string;
  emailEnabled?: boolean;
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
  status:
    | "PROCESSING"
    | "ACCEPTED"
    | "DELIVERED"
    | "FAILED"
    | "BOUNCED"
    | "COMPLAINED";
  error: string | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

function messageType(triggerType: EmailLogViewData["triggerType"]) {
  return triggerType === "RENT_REMINDER" ? "Rent reminder" : "Late notice";
}

const deliveryStatus = {
  PROCESSING: { label: "Processing", tone: "bg-amber-50 text-amber-800" },
  ACCEPTED: { label: "Accepted", tone: "bg-blue-50 text-blue-700" },
  DELIVERED: { label: "Delivered", tone: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Failed", tone: "bg-red-50 text-red-700" },
  BOUNCED: { label: "Bounced", tone: "bg-red-50 text-red-700" },
  COMPLAINED: { label: "Complaint", tone: "bg-red-50 text-red-700" },
} satisfies Record<
  EmailLogViewData["status"],
  { label: string; tone: string }
>;

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
  providerReadiness,
  retryAction,
  saved,
  settings,
  propertyHrefPrefix = "/?property=",
}: {
  action: (formData: FormData) => Promise<void>;
  coverage: EmailCoverageViewData;
  emailLogs: EmailLogViewData[];
  filteredPropertyId?: string | null;
  filteredPropertyName?: string | null;
  providerReadiness?: { configured: boolean; missing: string[] };
  retryAction?: (formData: FormData) => Promise<void>;
  saved?: boolean;
  settings: EmailSettingsViewData;
  propertyHrefPrefix?: string;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Tenant emails
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose when tenants receive rent reminders and late notices.
        </p>
      </header>

      {saved ? (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Tenant email settings saved.
        </p>
      ) : null}

      {!providerReadiness?.configured ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <MailWarning aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Tenant emails are not sending yet</p>
            <p className="mt-1 text-amber-900">
              Your settings are saved. Email will begin after delivery is
              connected.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        {coverage.missingEmail.length === 0 ? (
          <p className="font-medium text-emerald-800">
            Every active lease has a tenant email.
          </p>
        ) : coverage.missingEmail.length === 1 ? (
          <p className="text-zinc-700">
            {coverage.missingEmail.length} lease is missing a tenant email ·{" "}
            <Link
              className="font-semibold text-zinc-950 underline underline-offset-4"
              href={`${propertyHrefPrefix}${coverage.missingEmail[0].propertyId}`}
            >
              Add email
            </Link>
          </p>
        ) : (
          <details>
            <summary className="min-h-11 cursor-pointer py-2 font-medium text-zinc-800">
              {coverage.missingEmail.length} leases are missing tenant emails ·
              View leases
            </summary>
            <div className="grid gap-1 border-t border-zinc-100 pt-2">
              {coverage.missingEmail.map((item) => (
                <Link
                  className="inline-flex min-h-11 items-center font-medium text-zinc-800"
                  href={`${propertyHrefPrefix}${item.propertyId}`}
                  key={item.propertyId}
                >
                  {item.propertyName} · Add email
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>

      <form action={action} className="mt-5 space-y-5">
        <details className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-zinc-900 sm:px-5">
            Advanced settings
            <ChevronDown aria-hidden className="size-4 text-zinc-500" />
          </summary>
          <div className="grid gap-4 border-t border-zinc-100 p-4 sm:grid-cols-2 sm:p-5">
            <label className="text-sm font-medium text-zinc-800">
              Reply-to email
              <input
                autoComplete="email"
                className={`${fieldClass} h-11`}
                defaultValue={settings.replyToEmail ?? "owner@example.com"}
                name="replyToEmail"
                required
                type="email"
              />
            </label>
            <label className="text-sm font-medium text-zinc-800">
              Billing timezone
              <select
                className={`${fieldClass} h-11`}
                defaultValue={settings.timezone ?? "America/New_York"}
                name="timezone"
                required
              >
                <option value="America/New_York">Eastern time</option>
                <option value="America/Chicago">Central time</option>
                <option value="America/Denver">Mountain time</option>
                <option value="America/Los_Angeles">Pacific time</option>
                <option value="America/Phoenix">Arizona time</option>
                <option value="America/Anchorage">Alaska time</option>
                <option value="Pacific/Honolulu">Hawaii time</option>
                {![
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "America/Los_Angeles",
                  "America/Phoenix",
                  "America/Anchorage",
                  "Pacific/Honolulu",
                ].includes(settings.timezone ?? "America/New_York") ? (
                  <option value={settings.timezone}>{settings.timezone}</option>
                ) : null}
              </select>
            </label>
          </div>
        </details>

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
          <h2 className="text-lg font-semibold text-zinc-950">Late notice</h2>
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
          Save tenant email settings
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
                : "Recent tenant email deliveries."}
            </p>
          </div>
        </div>
        {emailLogs.length === 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
            No tenant emails have been sent yet.
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
              {emailLogs.map((log) => {
                const status = deliveryStatus[log.status];
                const failed =
                  log.status === "FAILED" ||
                  log.status === "BOUNCED" ||
                  log.status === "COMPLAINED";

                return (
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
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${status.tone}`}
                    >
                      {failed ? (
                        <AlertCircle aria-hidden className="size-3.5" />
                      ) : (
                        <CheckCircle2 aria-hidden className="size-3.5" />
                      )}
                      {status.label}
                    </span>
                    {log.status === "FAILED" && retryAction ? (
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
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
