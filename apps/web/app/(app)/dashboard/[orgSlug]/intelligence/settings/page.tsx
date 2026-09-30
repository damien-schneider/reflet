import { redirect } from "next/navigation";

export default async function IntelligenceSettingsRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/dashboard/${orgSlug}/intelligence?tab=settings`);
}
