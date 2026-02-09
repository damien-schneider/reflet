"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use, useEffect } from "react";

import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";
import { GitHubConnectionCard } from "@/features/github/components/github-connection-card";
import { IssuesSyncCard } from "@/features/github/components/issues-sync-card";
import { LabelMappingsCard } from "@/features/github/components/label-mappings-card";
import { RepositorySelectorCard } from "@/features/github/components/repository-selector-card";
import { SyncSettingsCard } from "@/features/github/components/sync-settings-card";
import { SyncedReleasesCard } from "@/features/github/components/synced-releases-card";
import { useGitHubSettings } from "@/features/github/hooks/use-github-settings";
import { useGitHubSettingsMutations } from "@/features/github/hooks/use-github-settings-mutations";
import { useGitHubSettingsQueries } from "@/features/github/hooks/use-github-settings-queries";

export default function GitHubSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const queries = useGitHubSettingsQueries({ orgId: org?._id });
  const mutations = useGitHubSettingsMutations();

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const settings = useGitHubSettings({
    orgId: org?._id,
    orgSlug,
    isConnected: queries.connectionStatus?.isConnected ?? false,
    hasRepository: queries.connectionStatus?.hasRepository ?? false,
    hasWebhook: queries.connectionStatus?.hasWebhook ?? false,
    selectRepository: async (
      args: Parameters<typeof mutations.selectRepositoryMutation>[0]
    ) => {
      await mutations.selectRepositoryMutation(args);
    },
    toggleAutoSync: async (
      args: Parameters<typeof mutations.toggleAutoSyncMutation>[0]
    ) => {
      await mutations.toggleAutoSyncMutation(args);
    },
    disconnect: async (
      args: Parameters<typeof mutations.disconnectMutation>[0]
    ) => {
      await mutations.disconnectMutation(args);
    },
    toggleIssuesSync: async (
      args: Parameters<typeof mutations.toggleIssuesSyncMutation>[0]
    ) => {
      await mutations.toggleIssuesSyncMutation(args);
    },
    upsertLabelMapping: async (
      args: Parameters<typeof mutations.upsertLabelMappingMutation>[0]
    ) => {
      await mutations.upsertLabelMappingMutation(args);
    },
    deleteLabelMapping: async (
      args: Parameters<typeof mutations.deleteLabelMappingMutation>[0]
    ) => {
      await mutations.deleteLabelMappingMutation(args);
    },
  });

  useEffect(() => {
    if (
      queries.connectionStatus?.isConnected &&
      !queries.connectionStatus?.hasRepository
    ) {
      settings.fetchRepositories();
    }
  }, [
    queries.connectionStatus?.isConnected,
    queries.connectionStatus?.hasRepository,
    settings.fetchRepositories,
  ]);

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <H1>GitHub Integration</H1>
        <Text variant="bodySmall">
          Connect GitHub to sync releases, issues, and automate your changelog
        </Text>
      </div>

      <div className="space-y-6">
        <GitHubConnectionCard
          accountAvatarUrl={queries.connectionStatus?.accountAvatarUrl}
          accountLogin={queries.connectionStatus?.accountLogin}
          isAdmin={isAdmin}
          isConnected={queries.connectionStatus?.isConnected ?? false}
          isDisconnecting={settings.isDisconnecting}
          onConnect={settings.handleConnectGitHub}
          onDisconnect={settings.handleDisconnect}
        />

        {queries.connectionStatus?.isConnected ? (
          <RepositorySelectorCard
            hasRepository={queries.connectionStatus.hasRepository}
            isAdmin={isAdmin}
            loadingRepos={settings.loadingRepos}
            onChangeRepository={settings.fetchRepositories}
            onConnectRepository={settings.handleSelectRepository}
            onSelectRepo={settings.setSelectedRepo}
            repositories={settings.repositories}
            repositoryFullName={queries.connectionStatus.repositoryFullName}
            selectedRepo={settings.selectedRepo}
          />
        ) : null}

        {queries.connectionStatus?.hasRepository ? (
          <RepositorySettingsSection
            autoSyncEnabled={queries.connectionStatus.autoSyncEnabled ?? false}
            githubLabels={settings.githubLabels}
            githubReleases={queries.githubReleases}
            isAdmin={isAdmin}
            isLoadingLabels={settings.isLoadingLabels}
            isSettingUp={settings.isSettingUp}
            isSyncing={settings.isSyncing}
            isSyncingIssues={settings.isSyncingIssues}
            issueSyncStatus={
              queries.issueSyncStatus
                ? {
                    ...queries.issueSyncStatus,
                    importedCount: queries.issueSyncStatus.importedCount ?? 0,
                  }
                : undefined
            }
            labelMappings={queries.labelMappings ?? []}
            lastSyncAt={queries.connectionStatus.lastSyncAt}
            onAddMapping={settings.handleAddLabelMapping}
            onClearWebhookError={settings.clearWebhookSetupError}
            onDeleteMapping={settings.handleDeleteLabelMapping}
            onFetchLabels={settings.fetchLabels}
            onResyncGitHub={settings.handleConnectGitHub}
            onSyncIssues={settings.handleSyncIssues}
            onSyncReleases={settings.handleSyncReleases}
            onToggleAutoSync={settings.handleToggleAutoSync}
            onToggleIssuesSync={settings.handleToggleIssuesSync}
            tags={queries.tags ?? []}
            webhookSetupError={settings.webhookSetupError}
          />
        ) : null}
      </div>
    </div>
  );
}

interface RepositorySettingsSectionProps {
  autoSyncEnabled: boolean;
  githubLabels: Array<{
    id: string;
    name: string;
    color: string;
    description: string | null;
  }>;
  githubReleases:
    | Array<{
        _id: string;
        tagName: string;
        name?: string;
        body?: string;
        htmlUrl: string;
        isPrerelease: boolean;
        publishedAt?: number;
      }>
    | undefined;
  isAdmin: boolean;
  isLoadingLabels: boolean;
  isSettingUp: boolean;
  isSyncing: boolean;
  isSyncingIssues: boolean;
  issueSyncStatus:
    | {
        isEnabled: boolean;
        autoSync: boolean;
        syncedIssuesCount: number;
        importedCount: number;
        mappingsCount: number;
        lastSyncAt?: number;
        lastSyncStatus?: string;
      }
    | undefined;
  labelMappings: Array<{
    _id: string;
    githubLabelName: string;
    githubLabelColor?: string;
    targetTagId?: string;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?:
      | "open"
      | "under_review"
      | "planned"
      | "in_progress"
      | "completed"
      | "closed";
    tagName?: string;
    tagColor?: string;
  }>;
  lastSyncAt?: number;
  onAddMapping: (mapping: {
    githubLabelName: string;
    githubLabelColor?: string;
    targetTagId?: string;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?:
      | "open"
      | "under_review"
      | "planned"
      | "in_progress"
      | "completed"
      | "closed";
  }) => void;
  onClearWebhookError: () => void;
  onDeleteMapping: (mappingId: string) => void;
  onFetchLabels: () => void;
  onResyncGitHub: () => void;
  onSyncIssues: () => void;
  onSyncReleases: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onToggleIssuesSync: (enabled: boolean, autoSync: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  webhookSetupError?: { code: string; message: string } | null;
}

function RepositorySettingsSection({
  autoSyncEnabled,
  githubLabels,
  githubReleases,
  isAdmin,
  isLoadingLabels,
  isSettingUp,
  isSyncing,
  isSyncingIssues,
  issueSyncStatus,
  labelMappings,
  lastSyncAt,
  onAddMapping,
  onClearWebhookError,
  onDeleteMapping,
  onFetchLabels,
  onResyncGitHub,
  onSyncIssues,
  onSyncReleases,
  onToggleAutoSync,
  onToggleIssuesSync,
  tags,
  webhookSetupError,
}: RepositorySettingsSectionProps) {
  return (
    <>
      <H3 className="mt-8 border-t pt-4">Releases</H3>
      <SyncSettingsCard
        autoSyncEnabled={autoSyncEnabled}
        error={webhookSetupError}
        isAdmin={isAdmin}
        isSettingUp={isSettingUp}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        onClearError={onClearWebhookError}
        onResyncGitHub={onResyncGitHub}
        onSyncNow={onSyncReleases}
        onToggleAutoSync={onToggleAutoSync}
      />

      {githubReleases ? (
        <SyncedReleasesCard
          releases={githubReleases.map((release) => ({
            ...release,
            isDraft: false,
          }))}
        />
      ) : null}

      <H3 className="mt-8 border-t pt-4">Issues</H3>
      <IssuesSyncCard
        autoSync={issueSyncStatus?.autoSync ?? false}
        importedCount={issueSyncStatus?.importedCount ?? 0}
        isAdmin={isAdmin}
        isEnabled={issueSyncStatus?.isEnabled ?? false}
        isSyncing={isSyncingIssues}
        lastSyncAt={issueSyncStatus?.lastSyncAt}
        lastSyncStatus={issueSyncStatus?.lastSyncStatus}
        mappingsCount={issueSyncStatus?.mappingsCount ?? 0}
        onSyncNow={onSyncIssues}
        onToggleSync={onToggleIssuesSync}
        syncedIssuesCount={issueSyncStatus?.syncedIssuesCount ?? 0}
      />

      <LabelMappingsCard
        githubLabels={githubLabels}
        isAdmin={isAdmin}
        isLoadingLabels={isLoadingLabels}
        mappings={labelMappings}
        onAddMapping={onAddMapping}
        onDeleteMapping={onDeleteMapping}
        onFetchLabels={onFetchLabels}
        tags={tags}
      />
    </>
  );
}
