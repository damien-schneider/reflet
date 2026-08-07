"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import {
  useWebsiteReferenceDialog,
  WebsiteReferenceAddButton,
  WebsiteReferenceList,
} from "@/features/ai-context/components/website-reference-list";
import { GitHubConnectionSection } from "@/features/github/components/github-connection-card";
import { IssuesSyncSection } from "@/features/github/components/issues-sync-card";
import { LabelMappingsSection } from "@/features/github/components/label-mappings-card";
import { RepositorySelectorSection } from "@/features/github/components/repository-selector-card";
import { SyncSettingsSection } from "@/features/github/components/sync-settings-card";
import { SyncedReleasesSection } from "@/features/github/components/synced-releases-card";
import { useGitHubSettings } from "@/features/github/hooks/use-github-settings";
import { useGitHubSettingsMutations } from "@/features/github/hooks/use-github-settings-mutations";
import { useGitHubSettingsQueries } from "@/features/github/hooks/use-github-settings-queries";
import { RepoAnalysisPanel } from "./repo-analysis-panel";

interface GitHubSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  userId: string | undefined;
}

export function GitHubSection({
  isAdmin,
  organizationId,
  orgSlug,
  userId,
}: GitHubSectionProps) {
  const queries = useGitHubSettingsQueries({ orgId: organizationId });
  const mutations = useGitHubSettingsMutations();
  const websiteDialog = useWebsiteReferenceDialog();

  const isConnected = queries.connectionStatus?.isConnected ?? false;
  const hasRepository = queries.connectionStatus?.hasRepository ?? false;
  const repoFullName = queries.connectionStatus?.repositoryFullName;

  const settings = useGitHubSettings({
    deleteLabelMapping: async (
      args: Parameters<typeof mutations.deleteLabelMappingMutation>[0]
    ) => {
      await mutations.deleteLabelMappingMutation(args);
    },
    disconnect: async (
      args: Parameters<typeof mutations.disconnectMutation>[0]
    ) => {
      await mutations.disconnectMutation(args);
    },
    hasRepository,
    hasWebhook: queries.connectionStatus?.hasWebhook ?? false,
    isConnected,
    orgId: organizationId,
    orgSlug,
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
    userId,
  });

  return (
    <div className="space-y-8">
      <h1 className="font-semibold text-lg">GitHub</h1>

      <section className="space-y-4">
        <h2 className="font-medium text-sm">Connection</h2>
        <GitHubConnectionSection
          accountAvatarUrl={queries.connectionStatus?.accountAvatarUrl}
          accountLogin={queries.connectionStatus?.accountLogin}
          connectHref={settings.connectHref}
          isAdmin={isAdmin}
          isConnected={isConnected}
          isDisconnecting={settings.isDisconnecting}
          isOwnerLeft={queries.connectionStatus?.isOwnerLeft}
          onConnectClick={settings.handleConnectClick}
          onDisconnect={settings.handleDisconnect}
        />
        {isConnected ? (
          <RepositorySelectorSection
            error={settings.repoError}
            hasRepository={hasRepository && !settings.isChangingRepository}
            isAdmin={isAdmin}
            loadingRepos={settings.loadingRepos}
            onChangeRepository={settings.handleChangeRepository}
            onConnectRepository={settings.handleSelectRepository}
            onSelectRepo={settings.setSelectedRepo}
            repositories={settings.repositories}
            repositoryFullName={repoFullName}
            selectedRepo={settings.selectedRepo}
          />
        ) : null}
      </section>

      {hasRepository ? (
        <GitHubRepoDetails
          isAdmin={isAdmin}
          isSyncingIssues={settings.isSyncingIssues}
          queries={queries}
          settings={settings}
        />
      ) : null}

      {hasRepository ? (
        <RepoAnalysisPanel isAdmin={isAdmin} organizationId={organizationId} />
      ) : null}

      <section className="space-y-4 border-t pt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-sm">Website references</h2>
          {isAdmin ? (
            <WebsiteReferenceAddButton
              onOpen={() => websiteDialog.setIsOpen(true)}
            />
          ) : null}
        </div>
        <WebsiteReferenceList
          dialogState={websiteDialog}
          isAdmin={isAdmin}
          organizationId={organizationId}
        />
      </section>
    </div>
  );
}

function GitHubRepoDetails({
  isAdmin,
  isSyncingIssues,
  queries,
  settings,
}: {
  isAdmin: boolean;
  isSyncingIssues: boolean;
  queries: ReturnType<typeof useGitHubSettingsQueries>;
  settings: ReturnType<typeof useGitHubSettings>;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6">
          <SyncSettingsSection
            autoSyncEnabled={queries.connectionStatus?.autoSyncEnabled ?? false}
            isAdmin={isAdmin}
            isSyncing={settings.isSyncing}
            lastSyncAt={queries.connectionStatus?.lastSyncAt}
            onSyncNow={settings.handleSyncReleases}
            onToggleAutoSync={settings.handleToggleAutoSync}
          />
          <SyncedReleasesSection releases={queries.githubReleases ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <IssuesSyncSection
            autoSync={queries.issueSyncStatus?.autoSync ?? false}
            importedCount={queries.issueSyncStatus?.importedCount ?? 0}
            isAdmin={isAdmin}
            isEnabled={queries.issueSyncStatus?.isEnabled ?? false}
            isSyncing={isSyncingIssues}
            lastSyncAt={queries.issueSyncStatus?.lastSyncAt}
            lastSyncStatus={queries.issueSyncStatus?.lastSyncStatus}
            mappingsCount={queries.issueSyncStatus?.mappingsCount ?? 0}
            onSyncNow={settings.handleSyncIssues}
            onToggleSync={settings.handleToggleIssuesSync}
            syncedIssuesCount={queries.issueSyncStatus?.syncedIssuesCount ?? 0}
          />
          <LabelMappingsSection
            githubLabels={settings.githubLabels}
            isAdmin={isAdmin}
            isLoadingLabels={settings.isLoadingLabels}
            mappings={queries.labelMappings ?? []}
            onAddMapping={settings.handleAddLabelMapping}
            onDeleteMapping={settings.handleDeleteLabelMapping}
            onFetchLabels={settings.fetchLabels}
            tags={queries.tags ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
