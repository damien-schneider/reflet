"use client";

import { Info, Lightning, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CommitInfo {
  sha: string;
  message: string;
  fullMessage: string;
  author: string;
  date: string;
}

interface FileInfo {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

interface GenerateFromCommitsProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  version: string;
  onStreamStart: () => void;
  onStreamChunk: (content: string) => void;
  onComplete: (content: string) => void;
  onTitleGenerated: (title: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function GenerateFromCommits({
  organizationId,
  orgSlug,
  version,
  onStreamStart,
  onStreamChunk,
  onComplete,
  onTitleGenerated,
  disabled,
  isStreaming,
}: GenerateFromCommitsProps) {
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const org = useQuery(api.organizations.get, { id: organizationId });
  const githubConnection = useQuery(api.github.getConnection, {
    organizationId,
  });

  const getToken = useAction(api.github_node_actions.getInstallationToken);
  const fetchTags = useAction(api.github_release_actions.fetchTags);
  const fetchCommits = useAction(
    api.github_release_actions.fetchCommitsBetweenRefs
  );
  const fetchRecent = useAction(api.github_release_actions.fetchRecentCommits);

  const hasInstallation = Boolean(githubConnection?.installationId);
  const hasRepository = Boolean(githubConnection?.repositoryFullName);
  const repoFullName = githubConnection?.repositoryFullName ?? "";
  const targetBranch =
    org?.changelogSettings?.targetBranch ??
    githubConnection?.repositoryDefaultBranch ??
    "main";

  const fetchGitHubChanges = async (
    installationId: string
  ): Promise<{
    commits: CommitInfo[];
    files: FileInfo[] | undefined;
    previousTag: string | null;
  }> => {
    const { token } = await getToken({ installationId });

    const tags = await fetchTags({
      installationToken: token,
      repositoryFullName: repoFullName,
    });

    const currentTag = version.trim();
    const previousTag = findPreviousTag(tags, currentTag);

    if (previousTag) {
      const head =
        currentTag && tagExists(tags, currentTag) ? currentTag : targetBranch;
      const result = await fetchCommits({
        installationToken: token,
        repositoryFullName: repoFullName,
        base: previousTag,
        head,
      });
      return { commits: result.commits, files: result.files, previousTag };
    }

    const commits = await fetchRecent({
      installationToken: token,
      repositoryFullName: repoFullName,
      branch: targetBranch,
      perPage: 30,
    });
    return { commits, files: undefined, previousTag };
  };

  const streamReleaseNotes = async (
    commits: CommitInfo[],
    files: FileInfo[] | undefined,
    previousTag: string | null
  ): Promise<string> => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentTag = version.trim();
    const response = await fetch("/api/ai/generate-release-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.message,
          fullMessage: c.fullMessage,
          author: c.author,
        })),
        files: files?.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
        version: currentTag || undefined,
        previousVersion: previousTag ?? undefined,
        repositoryName: repoFullName,
      }),
      signal: abortController.signal,
    });

    if (!(response.ok && response.body)) {
      throw new Error("Failed to start AI generation");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      fullContent += decoder.decode(value, { stream: true });
      onStreamChunk(fullContent);
    }

    abortControllerRef.current = null;
    return fullContent;
  };

  const generateTitle = async (description: string): Promise<void> => {
    try {
      const response = await fetch("/api/ai/generate-release-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          version: version.trim() || undefined,
        }),
      });

      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();
      if (
        data &&
        typeof data === "object" &&
        "title" in data &&
        typeof data.title === "string"
      ) {
        onTitleGenerated(data.title);
      }
    } catch {
      // Title generation is best-effort, don't show errors
    }
  };

  const handleGenerate = async () => {
    if (!(githubConnection?.installationId && repoFullName)) {
      toast.error("GitHub is not connected. Connect GitHub first.");
      return;
    }

    setIsFetchingCommits(true);

    try {
      const { commits, files, previousTag } = await fetchGitHubChanges(
        githubConnection.installationId
      );

      if (commits.length === 0) {
        toast.info("No commits found to generate from.");
        return;
      }

      setIsFetchingCommits(false);
      onStreamStart();

      const fullContent = await streamReleaseNotes(commits, files, previousTag);

      onComplete(fullContent);
      toast.success(
        `Generated from ${commits.length} commit${commits.length === 1 ? "" : "s"}`
      );

      generateTitle(fullContent);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Failed to generate notes";
      toast.error(message);
      onComplete("");
    } finally {
      setIsFetchingCommits(false);
    }
  };

  if (!hasInstallation) {
    return null;
  }

  if (!hasRepository) {
    return (
      <Link
        className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        href={`/dashboard/${orgSlug}/settings/github`}
      >
        <Info className="h-3 w-3" />
        Connect a repository to generate
      </Link>
    );
  }

  const isDisabled = disabled || isFetchingCommits || isStreaming;

  return (
    <Button
      className="h-7 gap-1 text-xs"
      disabled={isDisabled}
      onClick={handleGenerate}
      size="sm"
      title="Generate release notes from recent code changes on GitHub"
      type="button"
      variant="outline"
    >
      {isFetchingCommits || isStreaming ? (
        <>
          <Spinner className="h-3 w-3 animate-spin" />
          {isFetchingCommits ? "Fetching..." : "Generating..."}
        </>
      ) : (
        <>
          <Lightning className="h-3 w-3" />
          AI Generate
        </>
      )}
    </Button>
  );
}

function findPreviousTag(
  tags: Array<{ name: string; sha: string }>,
  currentVersion: string
): string | null {
  if (tags.length === 0) {
    return null;
  }

  if (currentVersion) {
    const currentIndex = tags.findIndex(
      (t) => t.name === currentVersion || t.name === `v${currentVersion}`
    );

    if (currentIndex >= 0 && currentIndex + 1 < tags.length) {
      return tags[currentIndex + 1]?.name ?? null;
    }

    return tags[0]?.name ?? null;
  }

  return tags[0]?.name ?? null;
}

function tagExists(tags: Array<{ name: string }>, tagName: string): boolean {
  return tags.some((t) => t.name === tagName || t.name === `v${tagName}`);
}
