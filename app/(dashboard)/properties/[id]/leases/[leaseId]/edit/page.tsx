import { redirect } from "next/navigation";

export default async function LegacyEditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/?property=${id}`);
}
