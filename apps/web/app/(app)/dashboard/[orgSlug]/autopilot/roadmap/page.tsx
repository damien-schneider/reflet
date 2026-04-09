"use client";

import { redirect } from "next/navigation";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AutopilotRoadmapPage() {
  const { orgSlug } = useAutopilotContext();
  redirect(`/dashboard/${orgSlug}/tasks`);
}
