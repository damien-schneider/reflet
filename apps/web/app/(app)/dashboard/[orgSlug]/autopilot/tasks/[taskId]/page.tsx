import { redirect } from "next/navigation";

export default async function LegacyTaskDetailRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; taskId: string }>;
}) {
  const { orgSlug, taskId } = await params;
  redirect(`/dashboard/${orgSlug}/tasks/${taskId}`);
}
