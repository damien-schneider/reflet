"use client";

import { GitBranch, Globe, Lock, Plug, Spinner } from "@phosphor-icons/react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Text } from "@/components/ui/typography";

interface Repository {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  id: string;
  isPrivate: boolean;
  name: string;
}

function formatRepositoryName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractOwner(fullName: string): string {
  return fullName.split("/")[0] ?? "";
}

function extractRepositoryName(fullName: string): string {
  return fullName.split("/")[1] ?? fullName;
}

function getRepositoryDisplayText(repo: Repository): string {
  return formatRepositoryName(extractRepositoryName(repo.fullName));
}

function getRepositorySearchText(repo: Repository): string {
  const owner = extractOwner(repo.fullName);
  const repoName = formatRepositoryName(extractRepositoryName(repo.fullName));
  const repoSlug = extractRepositoryName(repo.fullName);
  return `${owner} ${repoName} ${repoSlug} ${repo.fullName}`.toLowerCase();
}

interface RepositorySelectorCardProps {
  hasRepository: boolean;
  isAdmin: boolean;
  loadingRepos: boolean;
  onChangeRepository: () => void;
  onConnectRepository: () => void;
  onSelectRepo: (value: string) => void;
  repositories: Repository[];
  repositoryFullName?: string;
  selectedRepo: string;
}

export function RepositorySelectorSection({
  hasRepository,
  repositoryFullName,
  repositories,
  selectedRepo,
  loadingRepos,
  isAdmin,
  onSelectRepo,
  onConnectRepository,
  onChangeRepository,
}: RepositorySelectorCardProps) {
  const flatRepositories = useMemo(() => {
    return repositories.map((repo) => ({
      ...repo,
      searchText: getRepositorySearchText(repo),
    }));
  }, [repositories]);

  if (hasRepository) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <Text className="font-medium">{repositoryFullName}</Text>
        </div>
        {isAdmin ? (
          <Button onClick={onChangeRepository} size="sm" variant="ghost">
            Change
          </Button>
        ) : null}
      </div>
    );
  }

  if (loadingRepos) {
    return (
      <div className="flex items-center gap-2">
        <Spinner className="h-4 w-4 animate-spin" />
        <Text variant="bodySmall">Loading repositories...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Combobox
        filter={(repo, query) => {
          if (!query) {
            return true;
          }
          return repo.searchText.includes(query.toLowerCase());
        }}
        items={flatRepositories}
        itemToStringLabel={(repo) => getRepositoryDisplayText(repo)}
        onValueChange={(value) => {
          if (value) {
            onSelectRepo(value.id);
          }
        }}
        value={
          selectedRepo
            ? (flatRepositories.find((r) => r.id === selectedRepo) ?? null)
            : null
        }
      >
        <ComboboxInput placeholder="Search repositories..." />
        <ComboboxContent>
          <ComboboxList>
            {(repo) => (
              <ComboboxItem key={repo.id} value={repo}>
                <div className="flex items-center gap-2">
                  {repo.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col">
                    <span>{getRepositoryDisplayText(repo)}</span>
                    <span className="text-muted-foreground text-xs">
                      {repo.fullName}
                    </span>
                  </div>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>No repositories found</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      {isAdmin ? (
        <Button disabled={!selectedRepo} onClick={onConnectRepository}>
          <Plug className="mr-2 h-4 w-4" />
          Connect Repository
        </Button>
      ) : null}
    </div>
  );
}
