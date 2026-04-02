"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { capture } from "@/lib/analytics";

type IssueStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

interface Repository {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  id: string;
  isPrivate: boolean;
  name: string;
}

interface GitHubLabel {
  color: string;
  description: string | null;
  id: string;
  name: string;
}

interface UseGitHubSettingsProps {
  deleteLabelMapping: (args: {
    mappingId: Id<"githubLabelMappings">;
  }) => Promise<void>;
  disconnect: (args: { organizationId: Id<"organizations"> }) => Promise<void>;
  hasRepository: boolean;
  hasWebhook?: boolean;
  isConnected: boolean;
  orgId: Id<"organizations"> | undefined;
  orgSlug: string | undefined;
  selectRepository: (args: {
    organizationId: Id<"organizations">;
    repositoryId: string;
    repositoryFullName: string;
    defaultBranch: string;
  }) => Promise<void>;
  toggleAutoSync: (args: {
    organizationId: Id<"organizations">;
    enabled: boolean;
  }) => Promise<void>;
  toggleIssuesSync: (args: {
    organizationId: Id<"organizations">;
    enabled: boolean;
    autoSync: boolean;
  }) => Promise<void>;
  upsertLabelMapping: (args: {
    organizationId: Id<"organizations">;
    githubLabelName: string;
    githubLabelColor?: string;
    targetTagId?: Id<"tags">;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: IssueStatus;
  }) => Promise<void>;
  userId: string | undefined;
}

export function useGitHubSettings({
  orgId,
  orgSlug,
  userId,
  isConnected,
  hasRepository,
  hasWebhook,
  selectRepository,
  toggleAutoSync,
  disconnect,
  toggleIssuesSync,
  upsertLabelMapping,
  deleteLabelMapping,
}: UseGitHubSettingsProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncingIssues, setIsSyncingIssues] = useState(false);
  const [githubLabels, setGithubLabels] = useState<GitHubLabel[]>([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isChangingRepository, setIsChangingRepository] = useState(false);
  const [webhookSetupError, setWebhookSetupError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);

  const listRepositoriesAction = useAction(
    api.integrations.github.client_actions.listRepositories
  );
  const listLabelsAction = useAction(
    api.integrations.github.client_actions.listLabels
  );
  const syncReleasesAction = useAction(
    api.integrations.github.client_actions.syncReleases
  );
  const syncIssuesAction = useAction(
    api.integrations.github.client_actions.syncIssues
  );
  const setupWebhookAction = useAction(
    api.integrations.github.client_actions.setupWebhook
  );

  const fetchRepositories = async () => {
    if (!(orgId && isConnected)) {
      return;
    }
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const repos = await listRepositoriesAction({
        organizationId: orgId,
      });
      setRepositories(repos);
      if (repos.length === 0) {
        setRepoError(
          "No repositories found. Make sure the GitHub App has access to at least one repository in your GitHub App installation settings."
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setRepoError(message);
      console.error("Error fetching repositories:", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Auto-fetch repositories when connected but no repo selected
  useEffect(
    function syncRepositories() {
      if (!(isConnected && !hasRepository && orgId)) {
        return;
      }
      const run = async () => {
        setLoadingRepos(true);
        setRepoError(null);
        try {
          const repos = await listRepositoriesAction({
            organizationId: orgId,
          });
          setRepositories(repos);
          if (repos.length === 0) {
            setRepoError(
              "No repositories found. Make sure the GitHub App has access to at least one repository in your GitHub App installation settings."
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setRepoError(message);
          console.error("Error fetching repositories:", error);
        } finally {
          setLoadingRepos(false);
        }
      };
      run();
    },
    [isConnected, hasRepository, orgId, listRepositoriesAction]
  );

  const fetchLabels = async () => {
    if (!(orgId && hasRepository)) {
      return;
    }
    setIsLoadingLabels(true);
    try {
      const labels = await listLabelsAction({ organizationId: orgId });
      setGithubLabels(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const connectHref = buildGitHubInstallUrl({
    userId,
    organizationId: orgId,
    orgSlug,
  });

  const handleConnectClick = () => {
    capture("github_connected");
  };

  const handleConnectNavigate = () => {
    if (connectHref) {
      capture("github_connected");
      window.location.href = connectHref;
    }
  };

  const handleChangeRepository = async () => {
    setIsChangingRepository(true);
    setSelectedRepo("");
    await fetchRepositories();
  };

  const handleSelectRepository = async () => {
    if (!(orgId && selectedRepo)) {
      return;
    }
    const repo = repositories.find((r) => r.id === selectedRepo);
    if (!repo) {
      return;
    }
    await selectRepository({
      organizationId: orgId,
      repositoryId: repo.id,
      repositoryFullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
    });
    setIsChangingRepository(false);
  };

  const handleSyncReleases = async () => {
    if (!orgId) {
      return;
    }
    setIsSyncing(true);
    try {
      await syncReleasesAction({ organizationId: orgId });
    } catch (error) {
      console.error("Error syncing releases:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncIssues = async () => {
    if (!orgId) {
      return;
    }
    setIsSyncingIssues(true);
    try {
      await syncIssuesAction({ organizationId: orgId, state: "all" });
    } catch (error) {
      console.error("Error syncing issues:", error);
    } finally {
      setIsSyncingIssues(false);
    }
  };

  const handleSetup = async () => {
    if (!orgId) {
      return;
    }
    setIsSettingUp(true);
    setWebhookSetupError(null);
    try {
      await setupWebhookAction({ organizationId: orgId });
    } catch (error) {
      console.error("Error setting up:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setWebhookSetupError({
        code: "SETUP_FAILED",
        message,
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const clearWebhookSetupError = () => {
    setWebhookSetupError(null);
  };

  const handleDisconnect = async () => {
    if (!orgId) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await disconnect({ organizationId: orgId });
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!orgId) {
      return;
    }

    // When enabling auto-sync and webhook doesn't exist, set it up first
    if (enabled && !hasWebhook) {
      setIsSettingUp(true);
      setWebhookSetupError(null);
      try {
        await setupWebhookAction({ organizationId: orgId });
      } catch (error) {
        console.error("Error setting up webhook:", error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setWebhookSetupError({
          code: "SETUP_FAILED",
          message,
        });
        setIsSettingUp(false);
        return;
      }
      setIsSettingUp(false);
    }

    await toggleAutoSync({ organizationId: orgId, enabled });
  };

  const handleToggleIssuesSync = async (
    enabled: boolean,
    autoSync: boolean
  ) => {
    if (!orgId) {
      return;
    }
    await toggleIssuesSync({ organizationId: orgId, enabled, autoSync });
  };

  const handleAddLabelMapping = async (mapping: {
    githubLabelName: string;
    githubLabelColor?: string;
    targetTagId?: Id<"tags">;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: IssueStatus;
  }) => {
    if (!orgId) {
      return;
    }
    await upsertLabelMapping({
      organizationId: orgId,
      ...mapping,
      targetTagId: mapping.targetTagId,
    });
  };

  const handleDeleteLabelMapping = async (
    mappingId: Id<"githubLabelMappings">
  ) => {
    await deleteLabelMapping({
      mappingId,
    });
  };

  return {
    // State
    repositories,
    loadingRepos,
    selectedRepo,
    isSyncing,
    isSettingUp,
    isChangingRepository,
    isDisconnecting,
    isSyncingIssues,
    githubLabels,
    isLoadingLabels,
    webhookSetupError,
    repoError,
    // Setters
    setSelectedRepo,
    // Handlers
    fetchRepositories,
    handleChangeRepository,
    fetchLabels,
    connectHref,
    handleConnectClick,
    handleConnectNavigate,
    handleSelectRepository,
    handleSyncReleases,
    handleSyncIssues,
    handleSetup,
    handleDisconnect,
    handleToggleAutoSync,
    handleToggleIssuesSync,
    handleAddLabelMapping,
    handleDeleteLabelMapping,
    clearWebhookSetupError,
  };
}
