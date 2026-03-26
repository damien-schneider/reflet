import { redirect } from "next/navigation";

export default async function InboxSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/dashboard/${orgSlug}/inbox`);
}
