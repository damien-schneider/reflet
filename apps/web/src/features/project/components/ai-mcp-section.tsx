"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { McpSetupGuide } from "@/features/ai-context/components/mcp-setup-guide";
import { SuggestedPrompts } from "@/features/ai-context/components/suggested-prompts";

interface AiMcpSectionProps {
  organizationId: Id<"organizations">;
}

export function AiMcpSection({ organizationId }: AiMcpSectionProps) {
  return (
    <div className="space-y-6">
      <McpSetupGuide organizationId={organizationId} />
      <SuggestedPrompts />
    </div>
  );
}
