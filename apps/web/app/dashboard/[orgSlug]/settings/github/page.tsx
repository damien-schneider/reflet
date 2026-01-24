"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useCallback, useEffect, useState } from "react";

import { H1, H2, Muted, Text } from "@/components/ui/typography";
import { GitHubConnectionCard } from "@/features/github/components/github-connection-card";
import { RepositorySelectorCard } from "@/features/github/components/repository-selector-card";
import { SyncSettingsCard } from "@/features/github/components/sync-settings-card";
import { SyncedReleasesCard } from "@/features/github/components/synced-releases-card";
import { WebhookSetupCard } from "@/features/github/components/webhook-setup-card";

interface Repository {
  id: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
}

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

  const selectRepository = useMutation(api.github.selectRepository);
  const toggleAutoSync = useMutation(api.github.toggleAutoSync);
  const disconnect = useMutation(api.github.disconnect);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const fetchRepositories = useCallback(async () => {
    if (!(org?._id && connectionStatus?.isConnected)) {
      return;
    }
    setLoadingRepos(true);
    try {
      const response = await fetch(
        `/api/github/repositories?organizationId=${org._id}`
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
  }, [org?._id, connectionStatus?.isConnected]);

  useEffect(() => {
    if (connectionStatus?.isConnected && !connectionStatus?.hasRepository) {
      fetchRepositories();
    }
  }, [
    connectionStatus?.isConnected,
    connectionStatus?.hasRepository,
    fetchRepositories,
  ]);

  const handleConnectGitHub = () => {
    if (!org?._id) {
      return;
    }
    window.location.href = `/api/github/install?organizationId=${org._id}`;
  };

  const handleSelectRepository = async () => {
    if (!(org?._id && selectedRepo)) {
      return;
    }
    const repo = repositories.find((r) => r.id === selectedRepo);
    if (!repo) {
      return;
    }

    await selectRepository({
      organizationId: org._id,
      repositoryId: repo.id,
      repositoryFullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
    });
  };

  const handleSyncReleases = async () => {
    if (!org?._id) {
      return;
    }
    setIsSyncing(true);
    try {
      await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org._id }),
      });
    } catch (error) {
      console.error("Error syncing releases:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetup = async () => {
    if (!org?._id) {
      return;
    }
    setIsSettingUp(true);
    try {
      await fetch("/api/github/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: org._id,
          setupWebhook: true,
          setupCi: false,
        }),
      });
    } catch (error) {
      console.error("Error setting up:", error);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDisconnect = async () => {
    if (!org?._id) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await disconnect({ organizationId: org._id });
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!org?._id) {
      return;
    }
    await toggleAutoSync({ organizationId: org._id, enabled });
  };

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
          Connect GitHub to sync releases and automate your changelog
        </Text>
      </div>

      <div className="space-y-6">
        <GitHubConnectionCard
          accountAvatarUrl={connectionStatus?.accountAvatarUrl}
          accountLogin={connectionStatus?.accountLogin}
          isAdmin={isAdmin}
          isConnected={connectionStatus?.isConnected ?? false}
          isDisconnecting={isDisconnecting}
          onConnect={handleConnectGitHub}
          onDisconnect={handleDisconnect}
        />

        {connectionStatus?.isConnected ? (
          <RepositorySelectorCard
            hasRepository={connectionStatus.hasRepository}
            isAdmin={isAdmin}
            loadingRepos={loadingRepos}
            onChangeRepository={fetchRepositories}
            onConnectRepository={handleSelectRepository}
            onSelectRepo={setSelectedRepo}
            repositories={repositories}
            repositoryFullName={connectionStatus.repositoryFullName}
            selectedRepo={selectedRepo}
          />
        ) : null}

        {connectionStatus?.hasRepository ? (
          <>
            <SyncSettingsCard
              autoSyncEnabled={connectionStatus.autoSyncEnabled ?? false}
              isAdmin={isAdmin}
              isSyncing={isSyncing}
              lastSyncAt={connectionStatus.lastSyncAt}
              onSyncNow={handleSyncReleases}
              onToggleAutoSync={handleToggleAutoSync}
            />

            <WebhookSetupCard
              hasWebhook={connectionStatus.hasWebhook}
              isAdmin={isAdmin}
              isSettingUp={isSettingUp}
              onSetup={handleSetup}
            />
          </>
        ) : null}

        {githubReleases ? (
          <SyncedReleasesCard releases={githubReleases} />
        ) : null}
      </div>
    </div>
  );
}
