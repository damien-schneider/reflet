"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface UseGitHubSettingsQueriesProps {
  orgId: Id<"organizations"> | undefined;
}

export function useGitHubSettingsQueries({
  orgId,
}: UseGitHubSettingsQueriesProps) {
  const connectionStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    orgId ? { organizationId: orgId } : "skip"
  );
  const githubReleases = useQuery(
    api.integrations.github.queries.listGithubReleases,
    orgId ? { organizationId: orgId } : "skip"
  );
  const issueSyncStatus = useQuery(
    api.integrations.github.issue_queries.getIssueSyncStatus,
    orgId ? { organizationId: orgId } : "skip"
  );
  const labelMappings = useQuery(
    api.integrations.github.issue_queries.getLabelMappings,
    orgId ? { organizationId: orgId } : "skip"
  );
  const tags = useQuery(
    api.feedback.tags_queries.list,
    orgId ? { organizationId: orgId } : "skip"
  );

  return {
    connectionStatus,
    githubReleases,
    issueSyncStatus,
    labelMappings,
    tags,
  };
}
