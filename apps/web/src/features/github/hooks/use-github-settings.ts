"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useCallback, useState } from "react";

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
  isConnected: boolean;
  hasRepository: boolean;
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
    targetBoardId?: Id<"boards">;
    targetTagId?: Id<"tags">;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: string;
  }) => Promise<void>;
  deleteLabelMapping: (args: {
    mappingId: Id<"githubLabelMappings">;
  }) => Promise<void>;
}

export function useGitHubSettings({
  orgId,
  isConnected,
  hasRepository,
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

  const fetchRepositories = useCallback(async () => {
    if (!(orgId && isConnected)) {
      return;
    }
    setLoadingRepos(true);
    try {
      const response = await fetch(
        `/api/github/repositories?organizationId=${orgId}`
      );
      const data = (await response.json()) as { repositories: Repository[] };
      if (data.repositories) {
        setRepositories(data.repositories);
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
      const data = (await response.json()) as { labels: GitHubLabel[] };
      if (data.labels) {
        setGithubLabels(data.labels);
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setIsLoadingLabels(false);
    }
  }, [orgId, hasRepository]);

  const handleConnectGitHub = useCallback(() => {
    if (!orgId) {
      return;
    }
    window.location.href = `/api/github/install?organizationId=${orgId}`;
  }, [orgId]);

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
    try {
      await fetch("/api/github/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          setupWebhook: true,
          setupCi: false,
        }),
      });
    } catch (error) {
      console.error("Error setting up:", error);
    } finally {
      setIsSettingUp(false);
    }
  }, [orgId]);

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
      await toggleAutoSync({ organizationId: orgId, enabled });
    },
    [orgId, toggleAutoSync]
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
      targetBoardId?: string;
      targetTagId?: string;
      autoSync: boolean;
      syncClosedIssues?: boolean;
      defaultStatus?: string;
    }) => {
      if (!orgId) {
        return;
      }
      await upsertLabelMapping({
        organizationId: orgId,
        ...mapping,
        targetBoardId: mapping.targetBoardId as Id<"boards"> | undefined,
        targetTagId: mapping.targetTagId as Id<"tags"> | undefined,
      });
    },
    [orgId, upsertLabelMapping]
  );

  const handleDeleteLabelMapping = useCallback(
    async (mappingId: string) => {
      await deleteLabelMapping({
        mappingId: mappingId as Id<"githubLabelMappings">,
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
    isDisconnecting,
    isSyncingIssues,
    githubLabels,
    isLoadingLabels,
    // Setters
    setSelectedRepo,
    // Handlers
    fetchRepositories,
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
  };
}
