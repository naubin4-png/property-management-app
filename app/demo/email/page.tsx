import { EmailSettingsView } from "@/components/email-settings-view";
import { getDemoEmailData } from "@/lib/demo-data";

import { saveDemoEmailSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function DemoEmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, { settings, emailLogs }] = await Promise.all([
    searchParams,
    Promise.resolve(getDemoEmailData()),
  ]);

  return (
    <EmailSettingsView
      action={saveDemoEmailSettings}
      dashboardHref="/demo"
      emailLogs={emailLogs}
      saved={saved === "1"}
      settings={settings}
    />
  );
}
