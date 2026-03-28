"use client";

import { GitHubSection } from "@/features/project/components/github-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function GitHubPage() {
  const { isAdmin, organizationId, orgSlug } = useProjectContext();
  return (
    <GitHubSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  );
}
