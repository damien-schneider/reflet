"use client";

import {
  GitBranch,
  Globe,
  Link as LinkIcon,
  Lock,
  Plug,
  Spinner,
} from "@phosphor-icons/react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";

interface Repository {
  id: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
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
  repositoryFullName?: string;
  repositories: Repository[];
  selectedRepo: string;
  loadingRepos: boolean;
  isAdmin: boolean;
  onSelectRepo: (value: string) => void;
  onConnectRepository: () => void;
  onChangeRepository: () => void;
}

export function RepositorySelectorCard({
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
  // Flatten repositories for filtering - include owner and name in searchable text
  const flatRepositories = useMemo(() => {
    return repositories.map((repo) => ({
      ...repo,
      searchText: getRepositorySearchText(repo),
    }));
  }, [repositories]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Repository
        </CardTitle>
        <CardDescription>
          {repositoryFullName
            ? `Connected to ${repositoryFullName}`
            : "Select a repository to sync releases from"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasRepository ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Text className="font-medium">{repositoryFullName}</Text>
              </div>
            </div>
            {isAdmin ? (
              <Button onClick={onChangeRepository} size="sm" variant="outline">
                Change Repository
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {loadingRepos ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4 animate-spin" />
                <Text variant="bodySmall">Loading repositories...</Text>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Repository</Label>
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
                        ? flatRepositories.find((r) => r.id === selectedRepo)
                        : undefined
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
                </div>
                {isAdmin ? (
                  <Button
                    disabled={!selectedRepo}
                    onClick={onConnectRepository}
                  >
                    <Plug className="mr-2 h-4 w-4" />
                    Connect Repository
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
