"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { McpSetupGuide } from "@/features/ai-context/components/mcp-setup-guide";

interface AiMcpSectionProps {
  organizationId: Id<"organizations">;
}

export function AiMcpSection({ organizationId }: AiMcpSectionProps) {
  return <McpSetupGuide organizationId={organizationId} />;
}
