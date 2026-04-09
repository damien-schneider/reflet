"use client";

import { redirect } from "next/navigation";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AutopilotContentPage() {
  const { orgSlug } = useAutopilotContext();
  redirect(`/dashboard/${orgSlug}/community`);
}
