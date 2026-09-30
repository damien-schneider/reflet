"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@ctrl-ui/react/ui/combobox";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowsClockwise,
  GitBranch,
  Globe,
  Lock,
  Plug,
  Warning,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Text } from "@/components/ui/typography";

type SearchableRepository = Repository & { searchText: string };

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
  error?: string | null;
  hasRepository: boolean;
  isAdmin: boolean;
  loadingRepos: boolean;
  onChangeRepository: () => void;
  onConnectRepository: () => Promise<void> | void;
  onRetry?: () => void;
  onSelectRepo: (value: string) => void;
  repositories: Repository[];
  repositoryFullName?: string;
  selectedRepo: string;
}

export function RepositorySelectorSection({
  error,
  hasRepository,
  repositoryFullName,
  repositories,
  selectedRepo,
  loadingRepos,
  isAdmin,
  onSelectRepo,
  onConnectRepository,
  onChangeRepository,
  onRetry,
}: RepositorySelectorCardProps) {
  if (hasRepository) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <Text className="truncate font-medium" title={repositoryFullName}>
            {repositoryFullName}
          </Text>
        </div>
        {isAdmin ? (
          <Button onClick={onChangeRepository} size="xs" variant="ghost">
            Change
          </Button>
        ) : null}
      </div>
    );
  }

  if (loadingRepos) {
    return (
      <div aria-busy="true" className="space-y-3" role="status">
        <span className="sr-only">Loading repositories…</span>
        <Skeleton className="h-9 w-full" />
        {isAdmin ? <Skeleton className="h-9 w-40" /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <Warning aria-hidden="true" />
          <AlertTitle>Unable to load repositories</AlertTitle>
          <AlertDescription>
            <p className="text-pretty">{error}</p>
            {onRetry ? (
              <Button
                className="mt-3"
                onClick={onRetry}
                size="xs"
                variant="surface"
              >
                <ArrowsClockwise
                  aria-hidden="true"
                  className="size-4"
                  data-icon="inline-start"
                />
                Try again
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <RepositoryCombobox
        onSelectRepo={onSelectRepo}
        repositories={repositories}
        selectedRepo={selectedRepo}
      />
      {isAdmin ? (
        <ConnectRepositoryButton
          disabled={!selectedRepo}
          onConnectRepository={onConnectRepository}
        />
      ) : null}
    </div>
  );
}

function RepositoryCombobox({
  onSelectRepo,
  repositories,
  selectedRepo,
}: Pick<
  RepositorySelectorCardProps,
  "onSelectRepo" | "repositories" | "selectedRepo"
>) {
  const flatRepositories = repositories.map((repo) => ({
    ...repo,
    searchText: getRepositorySearchText(repo),
  }));

  return (
    <Combobox
      autoHighlight
      filter={(repo, query) =>
        !query || repo.searchText.includes(query.toLowerCase())
      }
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
      <ComboboxInput
        aria-label="Repository"
        placeholder="Search repositories…"
      />
      <ComboboxContent>
        <ComboboxList<SearchableRepository>>
          {(repo) => (
            <ComboboxItem key={repo.id} value={repo}>
              <div className="flex min-w-0 items-center gap-2">
                {repo.isPrivate ? (
                  <Lock
                    aria-label="Private"
                    className="size-4 shrink-0 text-muted-foreground"
                    role="img"
                  />
                ) : (
                  <Globe
                    aria-label="Public"
                    className="size-4 shrink-0 text-muted-foreground"
                    role="img"
                  />
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {getRepositoryDisplayText(repo)}
                  </span>
                  <span
                    className="truncate text-muted-foreground text-xs"
                    title={repo.fullName}
                  >
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
  );
}

function ConnectRepositoryButton({
  disabled,
  onConnectRepository,
}: {
  disabled: boolean;
  onConnectRepository: () => Promise<void> | void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnectRepository();
    } catch {
      toast.error("Unable to connect the repository. Try again.");
    }
    setIsConnecting(false);
  };

  return (
    <Button
      disabled={disabled || isConnecting}
      onClick={handleConnect}
      tone="primary"
      variant="solid"
    >
      {isConnecting ? (
        <Spinner data-icon="inline-start" size="xs" />
      ) : (
        <Plug aria-hidden="true" className="size-4" data-icon="inline-start" />
      )}
      Connect repository
    </Button>
  );
}
