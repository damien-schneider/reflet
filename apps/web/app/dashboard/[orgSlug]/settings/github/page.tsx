"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect } from "react";

import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";
import { GitHubConnectionCard } from "@/features/github/components/github-connection-card";
import { IssuesSyncCard } from "@/features/github/components/issues-sync-card";
import { LabelMappingsCard } from "@/features/github/components/label-mappings-card";
import { RepositorySelectorCard } from "@/features/github/components/repository-selector-card";
import { SyncSettingsCard } from "@/features/github/components/sync-settings-card";
import { SyncedReleasesCard } from "@/features/github/components/synced-releases-card";
import { WebhookSetupCard } from "@/features/github/components/webhook-setup-card";
import { useGitHubSettings } from "@/features/github/hooks/use-github-settings";

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
  const connectionStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const githubReleases = useQuery(
    api.github.listGithubReleases,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const issueSyncStatus = useQuery(
    api.github_issues.getIssueSyncStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const labelMappings = useQuery(
    api.github_issues.getLabelMappings,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const boards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const tags = useQuery(
    api.tags.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const selectRepository = useMutation(api.github.selectRepository);
  const toggleAutoSync = useMutation(api.github.toggleAutoSync);
  const disconnect = useMutation(api.github.disconnect);
  const toggleIssuesSync = useMutation(api.github_issues.toggleIssuesSync);
  const upsertLabelMapping = useMutation(api.github_issues.upsertLabelMapping);
  const deleteLabelMapping = useMutation(api.github_issues.deleteLabelMapping);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const settings = useGitHubSettings({
    orgId: org?._id,
    isConnected: connectionStatus?.isConnected ?? false,
    hasRepository: connectionStatus?.hasRepository ?? false,
    selectRepository,
    toggleAutoSync,
    disconnect,
    toggleIssuesSync,
    upsertLabelMapping,
    deleteLabelMapping,
  });

  useEffect(() => {
    if (connectionStatus?.isConnected && !connectionStatus?.hasRepository) {
      settings.fetchRepositories();
    }
  }, [
    connectionStatus?.isConnected,
    connectionStatus?.hasRepository,
    settings.fetchRepositories,
  ]);

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
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
    <div className="admin-container">
      <div className="mb-8">
        <H1>GitHub Integration</H1>
        <Text variant="bodySmall">
          Connect GitHub to sync releases, issues, and automate your changelog
        </Text>
      </div>

      <div className="space-y-6">
        <GitHubConnectionCard
          accountAvatarUrl={connectionStatus?.accountAvatarUrl}
          accountLogin={connectionStatus?.accountLogin}
          isAdmin={isAdmin}
          isConnected={connectionStatus?.isConnected ?? false}
          isDisconnecting={settings.isDisconnecting}
          onConnect={settings.handleConnectGitHub}
          onDisconnect={settings.handleDisconnect}
        />

        {connectionStatus?.isConnected ? (
          <RepositorySelectorCard
            hasRepository={connectionStatus.hasRepository}
            isAdmin={isAdmin}
            loadingRepos={settings.loadingRepos}
            onChangeRepository={settings.fetchRepositories}
            onConnectRepository={settings.handleSelectRepository}
            onSelectRepo={settings.setSelectedRepo}
            repositories={settings.repositories}
            repositoryFullName={connectionStatus.repositoryFullName}
            selectedRepo={settings.selectedRepo}
          />
        ) : null}

        {connectionStatus?.hasRepository ? (
          <RepositorySettingsSection
            autoSyncEnabled={connectionStatus.autoSyncEnabled ?? false}
            boards={boards ?? []}
            githubLabels={settings.githubLabels}
            githubReleases={githubReleases}
            hasWebhook={connectionStatus.hasWebhook}
            isAdmin={isAdmin}
            isLoadingLabels={settings.isLoadingLabels}
            isSettingUp={settings.isSettingUp}
            isSyncing={settings.isSyncing}
            isSyncingIssues={settings.isSyncingIssues}
            issueSyncStatus={issueSyncStatus}
            labelMappings={labelMappings ?? []}
            lastSyncAt={connectionStatus.lastSyncAt}
            onAddMapping={settings.handleAddLabelMapping}
            onDeleteMapping={settings.handleDeleteLabelMapping}
            onFetchLabels={settings.fetchLabels}
            onSetup={settings.handleSetup}
            onSyncIssues={settings.handleSyncIssues}
            onSyncReleases={settings.handleSyncReleases}
            onToggleAutoSync={settings.handleToggleAutoSync}
            onToggleIssuesSync={settings.handleToggleIssuesSync}
            tags={tags ?? []}
          />
        ) : null}
      </div>
    </div>
  );
}

interface RepositorySettingsSectionProps {
  autoSyncEnabled: boolean;
  boards: Array<{ _id: string; name: string; slug: string }>;
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
  hasWebhook: boolean;
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
    targetBoardId?: string;
    targetTagId?: string;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: string;
    boardName?: string;
    tagName?: string;
    tagColor?: string;
  }>;
  lastSyncAt?: number;
  onAddMapping: (mapping: {
    githubLabelName: string;
    githubLabelColor?: string;
    targetBoardId?: string;
    targetTagId?: string;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: string;
  }) => void;
  onDeleteMapping: (mappingId: string) => void;
  onFetchLabels: () => void;
  onSetup: () => void;
  onSyncIssues: () => void;
  onSyncReleases: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onToggleIssuesSync: (enabled: boolean, autoSync: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
}

function RepositorySettingsSection({
  autoSyncEnabled,
  boards,
  githubLabels,
  githubReleases,
  hasWebhook,
  isAdmin,
  isLoadingLabels,
  isSettingUp,
  isSyncing,
  isSyncingIssues,
  issueSyncStatus,
  labelMappings,
  lastSyncAt,
  onAddMapping,
  onDeleteMapping,
  onFetchLabels,
  onSetup,
  onSyncIssues,
  onSyncReleases,
  onToggleAutoSync,
  onToggleIssuesSync,
  tags,
}: RepositorySettingsSectionProps) {
  return (
    <>
      <H3 className="mt-8 border-t pt-4">Releases</H3>
      <SyncSettingsCard
        autoSyncEnabled={autoSyncEnabled}
        isAdmin={isAdmin}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        onSyncNow={onSyncReleases}
        onToggleAutoSync={onToggleAutoSync}
      />

      {githubReleases ? <SyncedReleasesCard releases={githubReleases} /> : null}

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
        boards={boards}
        githubLabels={githubLabels}
        isAdmin={isAdmin}
        isLoadingLabels={isLoadingLabels}
        mappings={labelMappings}
        onAddMapping={onAddMapping}
        onDeleteMapping={onDeleteMapping}
        onFetchLabels={onFetchLabels}
        tags={tags}
      />

      <H3 className="mt-8 border-t pt-4">Webhook</H3>
      <WebhookSetupCard
        hasWebhook={hasWebhook}
        isAdmin={isAdmin}
        isSettingUp={isSettingUp}
        onSetup={onSetup}
      />
    </>
  );
}
