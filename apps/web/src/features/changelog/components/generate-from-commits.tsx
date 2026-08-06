"use client";

import { Info, Lightning, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";

export interface CommitInfo {
  author: string;
  date: string;
  fullMessage: string;
  message: string;
  sha: string;
}

export interface FileInfo {
  additions: number;
  deletions: number;
  filename: string;
  status: string;
}

interface GenerateFromCommitsProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onCommitsFetched?: (
    commits: CommitInfo[],
    files: FileInfo[] | undefined,
    previousTag: string | null
  ) => void;
  onComplete: (content: string) => void;
  onStreamChunk: (content: string) => void;
  onStreamStart: () => void;
  onTitleGenerated: (title: string) => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  releaseId: Id<"releases"> | null;
  version: string;
}

export function GenerateFromCommits({
  organizationId,
  orgSlug,
  releaseId,
  version,
  onStreamStart,
  onStreamChunk,
  onComplete,
  onTitleGenerated,
  onCommitsFetched,
  disabled,
  isStreaming,
}: GenerateFromCommitsProps) {
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const org = useQuery(api.organizations.queries.get, { id: organizationId });
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    {
      organizationId,
    }
  );

  const listTags = useAction(api.integrations.github.repo_actions.listTags);
  const listCommitsBetweenRefs = useAction(
    api.integrations.github.repo_actions.listCommitsBetweenRefs
  );
  const listRecentCommits = useAction(
    api.integrations.github.repo_actions.listRecentCommits
  );

  const previousReleaseCommit = useQuery(
    api.changelog.release_commits.getLatestCommitFromPreviousRelease,
    { excludeReleaseId: releaseId ?? undefined, organizationId }
  );

  const hasInstallation = Boolean(githubConnection?.installationId);
  const hasRepository = Boolean(githubConnection?.repositoryFullName);
  const repoFullName = githubConnection?.repositoryFullName ?? "";
  const targetBranch =
    org?.changelogSettings?.targetBranch ??
    githubConnection?.repositoryDefaultBranch ??
    "main";

  const fetchGitHubChanges = async (): Promise<{
    commits: CommitInfo[];
    files: FileInfo[] | undefined;
    previousTag: string | null;
  }> => {
    const tags = await listTags({ organizationId });

    const currentTag = version.trim();
    const previousTag = findPreviousTag(tags, currentTag);

    if (previousTag) {
      const head =
        currentTag && tagExists(tags, currentTag) ? currentTag : targetBranch;
      const result = await listCommitsBetweenRefs({
        base: previousTag,
        head,
        organizationId,
      });
      return { commits: result.commits, files: result.files, previousTag };
    }

    // No tags found — try using the latest commit from the previous release as base
    if (previousReleaseCommit?.sha) {
      const result = await listCommitsBetweenRefs({
        base: previousReleaseCommit.sha,
        head: targetBranch,
        organizationId,
      });
      return { commits: result.commits, files: result.files, previousTag };
    }

    const commits = await listRecentCommits({
      branch: targetBranch,
      organizationId,
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
      body: JSON.stringify({
        commits: commits.map((c) => ({
          author: c.author,
          fullMessage: c.fullMessage,
          message: c.message,
          sha: c.sha,
        })),
        files: files?.map((f) => ({
          additions: f.additions,
          deletions: f.deletions,
          filename: f.filename,
          status: f.status,
        })),
        previousVersion: previousTag ?? undefined,
        repositoryName: repoFullName,
        version: currentTag || undefined,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? ""}/api/ai/generate-release-title`,
        {
          body: JSON.stringify({
            description,
            version: version.trim() || undefined,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

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
      const { commits, files, previousTag } = await fetchGitHubChanges();

      if (commits.length === 0) {
        toast.info("No commits found to generate from.");
        return;
      }

      onCommitsFetched?.(commits, files, previousTag);

      setIsFetchingCommits(false);
      onStreamStart();

      const fullContent = await streamReleaseNotes(commits, files, previousTag);

      onComplete(fullContent);
      capture("ai_release_notes_generated");
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
        href={`/dashboard/${orgSlug}/project/github`}
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
