"use client";

import { AiMcpSection } from "@/features/project/components/ai-mcp-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function AiMcpPage() {
  const { organizationId } = useProjectContext();
  return <AiMcpSection organizationId={organizationId} />;
}
