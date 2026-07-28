import { EmailSettingsView } from "@/components/email-settings-view";
import type { EmailSettingsViewData } from "@/components/email-settings-view";
import { cookies } from "next/headers";

import { getDemoEmailCoverage, getDemoEmailData } from "@/lib/demo-data";
import { defaultEmailSettings } from "@/lib/settings";

import { retryDemoEmailDelivery, saveDemoEmailSettings } from "../actions";

export const dynamic = "force-dynamic";

function parseDemoSettings(value?: string): EmailSettingsViewData {
  if (!value) {
    return defaultEmailSettings;
  }

  try {
    const parsed = JSON.parse(value) as Partial<EmailSettingsViewData>;
    return {
      sendBeforeDue:
        typeof parsed.sendBeforeDue === "boolean"
          ? parsed.sendBeforeDue
          : defaultEmailSettings.sendBeforeDue,
      sendAfterDue:
        typeof parsed.sendAfterDue === "boolean"
          ? parsed.sendAfterDue
          : defaultEmailSettings.sendAfterDue,
      daysBeforeReminder:
        typeof parsed.daysBeforeReminder === "number"
          ? parsed.daysBeforeReminder
          : defaultEmailSettings.daysBeforeReminder,
      gracePeriodDays:
        typeof parsed.gracePeriodDays === "number"
          ? parsed.gracePeriodDays
          : defaultEmailSettings.gracePeriodDays,
      reminderEmailSubject:
        parsed.reminderEmailSubject || defaultEmailSettings.reminderEmailSubject,
      reminderEmailBody:
        parsed.reminderEmailBody || defaultEmailSettings.reminderEmailBody,
      lateNoticeSubject:
        parsed.lateNoticeSubject || defaultEmailSettings.lateNoticeSubject,
      lateNoticeBody: parsed.lateNoticeBody || defaultEmailSettings.lateNoticeBody,
    };
  } catch {
    return defaultEmailSettings;
  }
}

function parseDemoRetriedLogIds(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default async function DemoEmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; saved?: string }>;
}) {
  const [{ property, saved }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const settings = parseDemoSettings(cookieStore.get("demo-reminder-settings")?.value);
  const retriedLogIds = parseDemoRetriedLogIds(
    cookieStore.get("demo-retried-email-logs")?.value,
  );
  const coverage = getDemoEmailCoverage();
  const { emailLogs } = getDemoEmailData(settings, retriedLogIds);
  const filteredLogs = property
    ? emailLogs.filter((log) => log.propertyId === property)
    : emailLogs;
  const filteredPropertyName =
    property && filteredLogs[0]
      ? filteredLogs[0].propertyName
      : coverage.missingEmail.find((item) => item.propertyId === property)
        ?.propertyName;

  return (
    <EmailSettingsView
      action={saveDemoEmailSettings}
      coverage={coverage}
      emailLogs={filteredLogs}
      filteredPropertyId={property}
      filteredPropertyName={filteredPropertyName}
      retryAction={retryDemoEmailDelivery}
      saved={saved === "1"}
      settings={settings}
    />
  );
}
