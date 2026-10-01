"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import {
  runOrToast,
  toWebhookSetupError,
  type WebhookSetupError,
} from "@/features/github/lib/github-settings-errors";
import { capture } from "@/lib/analytics";
import { useGitHubRepositories } from "./use-github-repositories";

type IssueStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

type PromoteTrigger = "manual" | "on_status" | "on_create";

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
  setPromoteTrigger: (args: {
    organizationId: Id<"organizations">;
    promoteTrigger: PromoteTrigger;
    promoteStatus?: IssueStatus;
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
  setPromoteTrigger,
  toggleAutoSync,
  disconnect,
  toggleIssuesSync,
  upsertLabelMapping,
  deleteLabelMapping,
}: UseGitHubSettingsProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncingIssues, setIsSyncingIssues] = useState(false);
  const [githubLabels, setGithubLabels] = useState<GitHubLabel[]>([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isChangingRepository, setIsChangingRepository] = useState(false);
  const [webhookSetupError, setWebhookSetupError] =
    useState<WebhookSetupError | null>(null);
  const { fetchRepositories, loadingRepos, repoError, repositories } =
    useGitHubRepositories({ hasRepository, isConnected, orgId });

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

  const fetchLabels = useCallback(async () => {
    if (!(orgId && hasRepository)) {
      return;
    }
    setIsLoadingLabels(true);
    try {
      const labels = await listLabelsAction({ organizationId: orgId });
      setGithubLabels(labels);
    } catch {
      toast.error("Unable to load GitHub labels. Try again.");
    }
    setIsLoadingLabels(false);
  }, [orgId, hasRepository, listLabelsAction]);

  const connectHref = buildGitHubInstallUrl({
    organizationId: orgId,
    orgSlug,
    userId,
  });
  const anotherAccountHref = buildGitHubInstallUrl({
    account: "new",
    organizationId: orgId,
    orgSlug,
    userId,
  });

  const handleConnectClick = useCallback(() => {
    capture("github_connected");
  }, []);

  const handleConnectNavigate = useCallback(() => {
    if (connectHref) {
      capture("github_connected");
      window.location.href = connectHref;
    }
  }, [connectHref]);

  const handleChangeRepository = useCallback(async () => {
    setIsChangingRepository(true);
    setSelectedRepo("");
    await fetchRepositories();
  }, [fetchRepositories]);

  const handleSelectRepository = useCallback(async () => {
    if (!(orgId && selectedRepo)) {
      return;
    }
    const repo = repositories.find((r) => r.id === selectedRepo);
    if (!repo) {
      return;
    }
    try {
      await selectRepository({
        defaultBranch: repo.defaultBranch,
        organizationId: orgId,
        repositoryFullName: repo.fullName,
        repositoryId: repo.id,
      });
      setIsChangingRepository(false);
    } catch {
      toast.error("Unable to connect the repository. Try again.");
    }
  }, [orgId, selectedRepo, repositories, selectRepository]);

  const handleSyncReleases = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSyncing(true);
    await runOrToast(
      () => syncReleasesAction({ organizationId: orgId }),
      "Unable to sync releases. Try again."
    );
    setIsSyncing(false);
  }, [orgId, syncReleasesAction]);

  const handleSyncIssues = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSyncingIssues(true);
    await runOrToast(
      () => syncIssuesAction({ organizationId: orgId, state: "all" }),
      "Unable to sync issues. Try again."
    );
    setIsSyncingIssues(false);
  }, [orgId, syncIssuesAction]);

  const handleSetup = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSettingUp(true);
    setWebhookSetupError(null);
    try {
      await setupWebhookAction({ organizationId: orgId });
    } catch (error) {
      setWebhookSetupError(toWebhookSetupError(error));
    }
    setIsSettingUp(false);
  }, [orgId, setupWebhookAction]);

  const clearWebhookSetupError = useCallback(() => {
    setWebhookSetupError(null);
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsDisconnecting(true);
    await runOrToast(
      () => disconnect({ organizationId: orgId }),
      "Unable to disconnect GitHub. Try again."
    );
    setIsDisconnecting(false);
  }, [orgId, disconnect]);

  const handleToggleAutoSync = useCallback(
    async (enabled: boolean) => {
      if (!orgId) {
        return;
      }

      if (enabled && !hasWebhook) {
        setIsSettingUp(true);
        setWebhookSetupError(null);
        try {
          await setupWebhookAction({ organizationId: orgId });
        } catch (error) {
          setWebhookSetupError(toWebhookSetupError(error));
          setIsSettingUp(false);
          return;
        }
        setIsSettingUp(false);
      }

      await runOrToast(
        () => toggleAutoSync({ enabled, organizationId: orgId }),
        "Unable to update auto-sync. Try again."
      );
    },
    [orgId, toggleAutoSync, hasWebhook, setupWebhookAction]
  );

  const handleToggleIssuesSync = useCallback(
    async (enabled: boolean, autoSync: boolean) => {
      if (!orgId) {
        return;
      }
      await runOrToast(
        () => toggleIssuesSync({ autoSync, enabled, organizationId: orgId }),
        "Unable to update issue sync. Try again."
      );
    },
    [orgId, toggleIssuesSync]
  );

  const handleSetPromoteTrigger = useCallback(
    async (promoteTrigger: PromoteTrigger, promoteStatus?: IssueStatus) => {
      if (!orgId) {
        return;
      }
      await runOrToast(
        () =>
          setPromoteTrigger({
            organizationId: orgId,
            promoteStatus,
            promoteTrigger,
          }),
        "Unable to update when GitHub issues are created. Try again."
      );
    },
    [orgId, setPromoteTrigger]
  );

  const handleAddLabelMapping = useCallback(
    async (mapping: {
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
      await runOrToast(
        () =>
          upsertLabelMapping({
            organizationId: orgId,
            ...mapping,
            targetTagId: mapping.targetTagId,
          }),
        "Unable to add the label mapping. Try again."
      );
    },
    [orgId, upsertLabelMapping]
  );

  const handleDeleteLabelMapping = useCallback(
    async (mappingId: Id<"githubLabelMappings">) => {
      await runOrToast(
        () => deleteLabelMapping({ mappingId }),
        "Unable to remove the label mapping. Try again."
      );
    },
    [deleteLabelMapping]
  );

  return {
    anotherAccountHref,
    clearWebhookSetupError,
    connectHref,
    fetchLabels,
    fetchRepositories,
    githubLabels,
    handleAddLabelMapping,
    handleChangeRepository,
    handleConnectClick,
    handleConnectNavigate,
    handleDeleteLabelMapping,
    handleDisconnect,
    handleSelectRepository,
    handleSetPromoteTrigger,
    handleSetup,
    handleSyncIssues,
    handleSyncReleases,
    handleToggleAutoSync,
    handleToggleIssuesSync,
    isChangingRepository,
    isDisconnecting,
    isLoadingLabels,
    isSettingUp,
    isSyncing,
    isSyncingIssues,
    loadingRepos,
    repoError,
    repositories,
    selectedRepo,
    setSelectedRepo,
    webhookSetupError,
  };
}
