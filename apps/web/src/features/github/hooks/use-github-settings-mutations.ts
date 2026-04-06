"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation } from "convex/react";

export function useGitHubSettingsMutations() {
  const selectRepositoryMutation = useMutation(
    api.integrations.github.connection_mutations.selectRepository
  );
  const toggleAutoSyncMutation = useMutation(
    api.integrations.github.connection_mutations.toggleAutoSync
  );
  const disconnectMutation = useMutation(
    api.integrations.github.connection_mutations.disconnect
  );
  const toggleIssuesSyncMutation = useMutation(
    api.integrations.github.issue_mutations.toggleIssuesSync
  );
  const upsertLabelMappingMutation = useMutation(
    api.integrations.github.issue_mutations.upsertLabelMapping
  );
  const deleteLabelMappingMutation = useMutation(
    api.integrations.github.issue_mutations.deleteLabelMapping
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
