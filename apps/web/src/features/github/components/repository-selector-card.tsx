"use client";

import {
  GitBranch,
  Link as LinkIcon,
  Plug,
  Spinner,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/typography";

interface Repository {
  id: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
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
                  <Select onValueChange={onSelectRepo} value={selectedRepo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.fullName}
                          {repo.isPrivate ? " (private)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
