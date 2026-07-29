import { DashboardNav } from "@/components/dashboard-nav";
import { redirect } from "next/navigation";

import { isPlatformAdministrator } from "@/lib/platform-admin";
import {
  getWorkspaceContext,
  WorkspaceAccessRequiredError,
} from "@/lib/workspace-context";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let context;
  try {
    context = await getWorkspaceContext();
  } catch (error) {
    if (error instanceof WorkspaceAccessRequiredError) {
      redirect("/invitation-required");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <DashboardNav
        isPlatformAdmin={isPlatformAdministrator(context.userId)}
        workspaceName={context.workspaceName}
      />
      {children}
    </div>
  );
}
