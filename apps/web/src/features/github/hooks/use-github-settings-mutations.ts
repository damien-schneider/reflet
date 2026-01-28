"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation } from "convex/react";

export function useGitHubSettingsMutations() {
  const selectRepositoryMutation = useMutation(api.github.selectRepository);
  const toggleAutoSyncMutation = useMutation(api.github.toggleAutoSync);
  const disconnectMutation = useMutation(api.github.disconnect);
  const toggleIssuesSyncMutation = useMutation(
    api.github_issues.toggleIssuesSync
  );
  const upsertLabelMappingMutation = useMutation(
    api.github_issues.upsertLabelMapping
  );
  const deleteLabelMappingMutation = useMutation(
    api.github_issues.deleteLabelMapping
  );

  return {
    selectRepositoryMutation,
    toggleAutoSyncMutation,
    disconnectMutation,
    toggleIssuesSyncMutation,
    upsertLabelMappingMutation,
    deleteLabelMappingMutation,
  };
}
