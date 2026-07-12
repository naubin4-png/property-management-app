import { redirect } from "next/navigation";

export default async function LegacyNewLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/?property=${id}&newLease=1`);
}
