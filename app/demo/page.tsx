import { DemoExperience } from "@/components/demo-experience";

export const metadata = {
  title: "Property Manager Demo",
  description: "Property Manager demo dashboard.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; property?: string }>;
}) {
  const query = await searchParams;

  return (
    <DemoExperience
      initialEmailPropertyId={query.property}
      initialIsEmailView={query.email === "1"}
    />
  );
}
