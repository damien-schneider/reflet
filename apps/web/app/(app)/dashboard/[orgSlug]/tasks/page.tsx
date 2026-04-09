import type { Metadata } from "next";
import TasksPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Tasks",
};

export default function TasksPage() {
  return <TasksPageClient />;
}
