"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useEffect, useState } from "react";

export interface Repository {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  id: string;
  isPrivate: boolean;
  name: string;
}

type ListRepositories = (args: {
  organizationId: Id<"organizations">;
}) => Promise<Repository[]>;

interface RepositoriesResult {
  error: string | null;
  repos: Repository[] | null;
}

const EMPTY_REPOSITORIES_MESSAGE =
  "Reflet can’t see any repositories yet. In GitHub, give the Reflet app access to a repository, then try again.";
const UNRESPONSIVE_MESSAGE = "GitHub didn’t respond. Try again in a moment.";

async function loadRepositories(
  listRepositories: ListRepositories,
  organizationId: Id<"organizations">
): Promise<RepositoriesResult> {
  try {
    const repos = await listRepositories({ organizationId });
    return {
      error: repos.length === 0 ? EMPTY_REPOSITORIES_MESSAGE : null,
      repos,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : UNRESPONSIVE_MESSAGE;
    return { error: message, repos: null };
  }
}

export function useGitHubRepositories({
  orgId,
  isConnected,
  hasRepository,
}: {
  orgId: Id<"organizations"> | undefined;
  isConnected: boolean;
  hasRepository: boolean;
}) {
  const listRepositoriesAction = useAction(
    api.integrations.github.client_actions.listRepositories
  );
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [autoFetchedKey, setAutoFetchedKey] = useState<string | null>(null);

  const autoFetchKey =
    orgId && isConnected && !hasRepository ? String(orgId) : null;
  const isAutoLoading =
    autoFetchKey !== null && autoFetchedKey !== autoFetchKey;

  const applyResult = (result: RepositoriesResult) => {
    if (result.repos) {
      setRepositories(result.repos);
    }
    setRepoError(result.error);
  };

  useEffect(() => {
    if (!(orgId && autoFetchKey)) {
      return;
    }
    let cancelled = false;
    loadRepositories(listRepositoriesAction, orgId).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.repos) {
        setRepositories(result.repos);
      }
      setRepoError(result.error);
      setAutoFetchedKey(autoFetchKey);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, autoFetchKey, listRepositoriesAction]);

  const fetchRepositories = async () => {
    if (!(orgId && isConnected)) {
      return;
    }
    setLoadingRepos(true);
    setRepoError(null);
    applyResult(await loadRepositories(listRepositoriesAction, orgId));
    setLoadingRepos(false);
  };

  return {
    fetchRepositories,
    loadingRepos: loadingRepos || isAutoLoading,
    repoError,
    repositories,
  };
}
