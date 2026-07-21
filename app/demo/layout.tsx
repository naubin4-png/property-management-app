import { TopBar } from "@/components/dashboard-nav";

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
        Demo mode — sample data, nothing is saved
      </div>
      <TopBar
        addCheckHref="/demo?addCheck=1"
        addPropertyHref="/demo?addProperty=1"
        dashboardHref="/demo"
        emailHref="/demo/email"
        ownerSignInHref="/login"
      />
      {children}
    </div>
  );
}
