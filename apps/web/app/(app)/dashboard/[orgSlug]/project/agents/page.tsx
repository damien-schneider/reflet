"use client";

import { AgentsSection } from "@/features/project/components/agents-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function AgentsPage() {
  const { organizationId } = useProjectContext();
  return <AgentsSection organizationId={organizationId} />;
}
