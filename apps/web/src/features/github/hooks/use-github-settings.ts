"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useCallback, useState } from "react";

interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  code?: string;
  message?: string;
}

const parseApiError = (json: unknown): ApiErrorResponse => {
  if (!json || typeof json !== "object") {
    return {};
  }
  const obj = json as Record<string, unknown>;
  return {
    success: typeof obj.success === "boolean" ? obj.success : undefined,
    error: typeof obj.error === "string" ? obj.error : undefined,
    code: typeof obj.code === "string" ? obj.code : undefined,
    message: typeof obj.message === "string" ? obj.message : undefined,
  };
};

type IssueStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

interface Repository {
  id: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
}

interface GitHubLabel {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface UseGitHubSettingsProps {
  orgId: Id<"organizations"> | undefined;
  orgSlug: string | undefined;
  isConnected: boolean;
  hasRepository: boolean;
  hasWebhook?: boolean;
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
  disconnect: (args: { organizationId: Id<"organizations"> }) => Promise<void>;
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
  deleteLabelMapping: (args: {
    mappingId: Id<"githubLabelMappings">;
  }) => Promise<void>;
}

export function useGitHubSettings({
  orgId,
  orgSlug,
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

  const fetchRepositories = useCallback(async () => {
    if (!(orgId && isConnected)) {
      return;
    }
    setLoadingRepos(true);
    try {
      const response = await fetch(
        `/api/github/repositories?organizationId=${orgId}`,
        {
          cache: "no-store",
        }
      );
      const data: unknown = await response.json();
      if (
        data &&
        typeof data === "object" &&
        "repositories" in data &&
        Array.isArray(data.repositories)
      ) {
        setRepositories(data.repositories as Repository[]);
      }
    } catch (error) {
      console.error("Error fetching repositories:", error);
    } finally {
      setLoadingRepos(false);
    }
  }, [orgId, isConnected]);

  const fetchLabels = useCallback(async () => {
    if (!(orgId && hasRepository)) {
      return;
    }
    setIsLoadingLabels(true);
    try {
      const response = await fetch(
        `/api/github/labels?organizationId=${orgId}`
      );
      const data: unknown = await response.json();
      if (
        data &&
        typeof data === "object" &&
        "labels" in data &&
        Array.isArray(data.labels)
      ) {
        setGithubLabels(data.labels as GitHubLabel[]);
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setIsLoadingLabels(false);
    }
  }, [orgId, hasRepository]);

  const handleConnectGitHub = useCallback(() => {
    if (!(orgId && orgSlug)) {
      return;
    }
    window.location.href = `/api/github/install?organizationId=${orgId}&orgSlug=${encodeURIComponent(orgSlug)}`;
  }, [orgId, orgSlug]);

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
    await selectRepository({
      organizationId: orgId,
      repositoryId: repo.id,
      repositoryFullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
    });
    setIsChangingRepository(false);
  }, [orgId, selectedRepo, repositories, selectRepository]);

  const handleSyncReleases = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSyncing(true);
    try {
      await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
    } catch (error) {
      console.error("Error syncing releases:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [orgId]);

  const handleSyncIssues = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSyncingIssues(true);
    try {
      await fetch("/api/github/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, state: "all" }),
      });
    } catch (error) {
      console.error("Error syncing issues:", error);
    } finally {
      setIsSyncingIssues(false);
    }
  }, [orgId]);

  const handleSetup = useCallback(async () => {
    if (!orgId) {
      return;
    }
    setIsSettingUp(true);
    setWebhookSetupError(null);
    try {
      const response = await fetch("/api/github/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          setupWebhook: true,
          setupCi: false,
        }),
      });

      const data = parseApiError(await response.json());

      if (!response.ok || data.error) {
        setWebhookSetupError({
          code: data.code ?? "UNKNOWN_ERROR",
          message: data.message ?? data.error ?? "An unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Error setting up:", error);
      setWebhookSetupError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to the server. Please try again.",
      });
    } finally {
      setIsSettingUp(false);
    }
  }, [orgId]);

  const clearWebhookSetupError = useCallback(() => {
    setWebhookSetupError(null);
  }, []);

  const handleDisconnect = useCallback(async () => {
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
  }, [orgId, disconnect]);

  const handleToggleAutoSync = useCallback(
    async (enabled: boolean) => {
      if (!orgId) {
        return;
      }

      // When enabling auto-sync and webhook doesn't exist, set it up first
      if (enabled && !hasWebhook) {
        setIsSettingUp(true);
        setWebhookSetupError(null);
        try {
          const response = await fetch("/api/github/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              setupWebhook: true,
              setupCi: false,
            }),
          });

          const data = parseApiError(await response.json());

          if (!response.ok || data.error) {
            setWebhookSetupError({
              code: data.code ?? "UNKNOWN_ERROR",
              message:
                data.message ?? data.error ?? "An unknown error occurred",
            });
            setIsSettingUp(false);
            return; // Don't enable auto-sync if webhook setup failed
          }
        } catch (error) {
          console.error("Error setting up webhook:", error);
          setWebhookSetupError({
            code: "NETWORK_ERROR",
            message: "Failed to connect to the server. Please try again.",
          });
          setIsSettingUp(false);
          return; // Don't enable auto-sync if webhook setup failed
        }
        setIsSettingUp(false);
      }

      await toggleAutoSync({ organizationId: orgId, enabled });
    },
    [orgId, toggleAutoSync, hasWebhook]
  );

  const handleToggleIssuesSync = useCallback(
    async (enabled: boolean, autoSync: boolean) => {
      if (!orgId) {
        return;
      }
      await toggleIssuesSync({ organizationId: orgId, enabled, autoSync });
    },
    [orgId, toggleIssuesSync]
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
      await upsertLabelMapping({
        organizationId: orgId,
        ...mapping,
        targetTagId: mapping.targetTagId,
      });
    },
    [orgId, upsertLabelMapping]
  );

  const handleDeleteLabelMapping = useCallback(
    async (mappingId: Id<"githubLabelMappings">) => {
      await deleteLabelMapping({
        mappingId,
      });
    },
    [deleteLabelMapping]
  );

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
    // Setters
    setSelectedRepo,
    // Handlers
    fetchRepositories,
    handleChangeRepository,
    fetchLabels,
    handleConnectGitHub,
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
