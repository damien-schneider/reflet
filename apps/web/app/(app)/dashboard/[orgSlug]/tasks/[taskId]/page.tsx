import type { Metadata } from "next";

import TaskDetailPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Task",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetailPageClient taskId={taskId} />;
}
