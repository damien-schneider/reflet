"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface UseGitHubSettingsQueriesProps {
  orgId: Id<"organizations"> | undefined;
}

export function useGitHubSettingsQueries({
  orgId,
}: UseGitHubSettingsQueriesProps) {
  const connectionStatus = useQuery(
    api.github.getConnectionStatus,
    orgId ? { organizationId: orgId } : "skip"
  );
  const githubReleases = useQuery(
    api.github.listGithubReleases,
    orgId ? { organizationId: orgId } : "skip"
  );
  const issueSyncStatus = useQuery(
    api.github_issues.getIssueSyncStatus,
    orgId ? { organizationId: orgId } : "skip"
  );
  const labelMappings = useQuery(
    api.github_issues.getLabelMappings,
    orgId ? { organizationId: orgId } : "skip"
  );
  const boards = useQuery(
    api.boards.list,
    orgId ? { organizationId: orgId } : "skip"
  );
  const tags = useQuery(
    api.tags.list,
    orgId ? { organizationId: orgId } : "skip"
  );

  return {
    connectionStatus,
    githubReleases,
    issueSyncStatus,
    labelMappings,
    boards,
    tags,
  };
}
