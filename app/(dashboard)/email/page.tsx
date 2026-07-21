import { EmailSettingsView } from "@/components/email-settings-view";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

import { saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";

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
    <EmailSettingsView
      action={saveEmailSettings}
      emailLogs={emailLogs}
      saved={saved === "1"}
      settings={settings}
    />
  );
}
