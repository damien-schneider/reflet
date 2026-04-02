"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { RepoAnalysisPanel } from "@/features/project/components/repo-analysis-panel";

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
    orgId: organizationId,
    orgSlug,
    userId,
    isConnected,
    hasRepository,
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

  return (
    <div className="space-y-6">
      {/* GitHub Connection & Repository */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Connection</CardTitle>
          {isConnected ? null : (
            <CardDescription>
              Connect your GitHub account to sync releases
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

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

      {/* Website References */}
      <Card>
        <CardHeader>
          <CardTitle>Website References</CardTitle>
          <CardDescription>
            Add websites to provide additional context for AI
          </CardDescription>
          {isAdmin ? (
            <CardAction>
              <WebsiteReferenceAddButton
                onOpen={() => websiteDialog.setIsOpen(true)}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <WebsiteReferenceList
            dialogState={websiteDialog}
            isAdmin={isAdmin}
            organizationId={organizationId}
          />
        </CardContent>
      </Card>
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
      {/* Release Sync */}
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

      {/* Issue Sync & Label Mappings */}
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
