"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";

export function useGitHubSettingsMutations() {
  const selectRepositoryMutation = useMutation(
    api.integrations.github.mutations.selectRepository
  );
  const toggleAutoSyncMutation = useMutation(
    api.integrations.github.mutations.toggleAutoSync
  );
  const disconnectMutation = useMutation(
    api.integrations.github.mutations.disconnect
  );
  const toggleIssuesSyncMutation = useMutation(
    api.integrations.github.issue_sync.toggleIssuesSync
  );
  const upsertLabelMappingMutation = useMutation(
    api.integrations.github.issue_mappings.upsertLabelMapping
  );
  const deleteLabelMappingMutation = useMutation(
    api.integrations.github.issue_mappings.deleteLabelMapping
  );

  return {
    deleteLabelMappingMutation,
    disconnectMutation,
    selectRepositoryMutation,
    toggleAutoSyncMutation,
    toggleIssuesSyncMutation,
    upsertLabelMappingMutation,
  };
}
