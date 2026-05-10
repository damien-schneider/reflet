import { redirect } from "next/navigation";

export default async function SettingsLayout({
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/dashboard/${orgSlug}/project`);
}
