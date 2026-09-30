"use client";

import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
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
import { SettingsPage, SettingsSection } from "./settings-page";

const PAGE_DESCRIPTION =
  "Sync releases and issues with a repository, and give the AI context about your product.";

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
    setPromoteTrigger: async (
      args: Parameters<typeof mutations.setPromoteTriggerMutation>[0]
    ) => {
      await mutations.setPromoteTriggerMutation(args);
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

  if (queries.connectionStatus === undefined) {
    return (
      <SettingsPage description={PAGE_DESCRIPTION} title="GitHub">
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage description={PAGE_DESCRIPTION} title="GitHub">
      <SettingsSection title="Connection">
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
            onRetry={settings.fetchRepositories}
            onSelectRepo={settings.setSelectedRepo}
            repositories={settings.repositories}
            repositoryFullName={repoFullName}
            selectedRepo={settings.selectedRepo}
          />
        ) : null}
      </SettingsSection>

      {hasRepository ? (
        <SettingsSection title="Releases and issues">
          <GitHubRepoDetails
            isAdmin={isAdmin}
            isSyncingIssues={settings.isSyncingIssues}
            queries={queries}
            settings={settings}
          />
        </SettingsSection>
      ) : null}

      {hasRepository ? (
        <RepoAnalysisPanel isAdmin={isAdmin} organizationId={organizationId} />
      ) : null}

      <SettingsSection
        actions={
          isAdmin ? (
            <WebsiteReferenceAddButton
              onOpen={() => websiteDialog.setIsOpen(true)}
            />
          ) : null
        }
        description="Pages the AI reads for extra context when clarifying feedback."
        title="Website references"
      >
        <WebsiteReferenceList
          dialogState={websiteDialog}
          isAdmin={isAdmin}
          organizationId={organizationId}
        />
      </SettingsSection>
    </SettingsPage>
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="space-y-6">
          <SyncSettingsSection
            autoSyncEnabled={queries.connectionStatus?.autoSyncEnabled ?? false}
            error={settings.webhookSetupError}
            isAdmin={isAdmin}
            isSettingUp={settings.isSettingUp}
            isSyncing={settings.isSyncing}
            lastSyncAt={queries.connectionStatus?.lastSyncAt}
            onClearError={settings.clearWebhookSetupError}
            onResyncGitHub={settings.handleConnectNavigate}
            onSyncNow={settings.handleSyncReleases}
            onToggleAutoSync={settings.handleToggleAutoSync}
          />
          <SyncedReleasesSection releases={queries.githubReleases} />
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
            onPromoteTriggerChange={settings.handleSetPromoteTrigger}
            onSyncNow={settings.handleSyncIssues}
            onToggleSync={settings.handleToggleIssuesSync}
            promoteStatus={queries.issueSyncStatus?.promoteStatus}
            promoteTrigger={queries.issueSyncStatus?.promoteTrigger ?? "manual"}
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
