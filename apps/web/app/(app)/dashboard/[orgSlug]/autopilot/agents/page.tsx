"use client";

import { H2 } from "@/components/ui/typography";
import { AgentsGridView } from "@/features/autopilot/components/agents/agents-grid-view";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AutopilotAgentsPage() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  return (
    <div className="space-y-6">
      <H2 variant="card">Agents</H2>
      <AgentsGridView baseUrl={baseUrl} organizationId={organizationId} />
    </div>
  );
}
