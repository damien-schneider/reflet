"use client";

import { GitHubSection } from "@/features/project/components/github-section";
import { useProjectContext } from "@/features/project/components/project-context";
import { authClient } from "@/lib/auth-client";

export default function GitHubPage() {
  const { isAdmin, organizationId, orgSlug } = useProjectContext();
  const { data: session } = authClient.useSession();
  return (
    <GitHubSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
      userId={session?.user?.id}
    />
  );
}
