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
    api.integrations.github.issues.toggleIssuesSync
  );
  const upsertLabelMappingMutation = useMutation(
    api.integrations.github.issues.upsertLabelMapping
  );
  const deleteLabelMappingMutation = useMutation(
    api.integrations.github.issues.deleteLabelMapping
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
