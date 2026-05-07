"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { AgentDetailView } from "@/features/autopilot/components/agents/agent-detail-view";
import {
  GRID_AGENT_IDS,
  type GridAgentId,
} from "@/features/autopilot/components/agents/agent-grid-card";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

const VALID_AGENT_IDS = new Set<string>(GRID_AGENT_IDS);

function isGridAgentId(agentId: string): agentId is GridAgentId {
  return VALID_AGENT_IDS.has(agentId);
}

export default function AutopilotAgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { organizationId, isAdmin, orgSlug } = useAutopilotContext();
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  if (!isGridAgentId(agentId)) {
    notFound();
  }

  return (
    <AgentDetailView
      agentId={agentId}
      baseUrl={baseUrl}
      isAdmin={isAdmin}
      organizationId={organizationId}
    />
  );
}
