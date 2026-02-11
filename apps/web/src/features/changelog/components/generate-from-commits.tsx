"use client";

import { Lightning, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
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
  version: string;
  onGenerated: (content: string) => void;
  disabled?: boolean;
}

/**
 * Button that fetches code changes from GitHub and generates
 * release notes using AI. Pro feature.
 */
export function GenerateFromCommits({
  organizationId,
  version,
  onGenerated,
  disabled,
}: GenerateFromCommitsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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
  const generateNotes = useAction(api.release_notes_ai.generateReleaseNotes);

  const isConnected = Boolean(
    githubConnection?.repositoryFullName && githubConnection?.installationId
  );
  const repoFullName = githubConnection?.repositoryFullName ?? "";
  const targetBranch =
    org?.changelogSettings?.targetBranch ??
    githubConnection?.repositoryDefaultBranch ??
    "main";

  const handleGenerate = async () => {
    if (!(githubConnection?.installationId && repoFullName)) {
      toast.error("GitHub is not connected. Connect GitHub first.");
      return;
    }

    setIsGenerating(true);
    try {
      // Step 1: Get installation token
      const { token } = await getToken({
        installationId: githubConnection.installationId,
      });

      // Step 2: Get tags to find previous version
      const tags = await fetchTags({
        installationToken: token,
        repositoryFullName: repoFullName,
      });

      // Step 3: Determine base and head for comparison
      let commits: CommitInfo[] = [];
      let files: FileInfo[] | undefined;
      const currentTag = version.trim();
      const previousTag = findPreviousTag(tags, currentTag);

      if (previousTag) {
        // Compare between previous tag and either current tag or branch HEAD
        const head =
          currentTag && tagExists(tags, currentTag) ? currentTag : targetBranch;
        const result = await fetchCommits({
          installationToken: token,
          repositoryFullName: repoFullName,
          base: previousTag,
          head,
        });
        commits = result.commits;
        files = result.files;
      } else {
        // No previous tag — fetch recent commits on the branch
        commits = await fetchRecent({
          installationToken: token,
          repositoryFullName: repoFullName,
          branch: targetBranch,
          perPage: 30,
        });
        files = undefined;
      }

      if (commits.length === 0) {
        toast.info("No commits found to generate from.");
        return;
      }

      // Step 4: Generate release notes with AI
      const notes = await generateNotes({
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
      });

      onGenerated(notes);
      toast.success(
        `Generated from ${commits.length} commit${commits.length === 1 ? "" : "s"}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate notes";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      className="h-7 gap-1 text-xs"
      disabled={disabled || isGenerating}
      onClick={handleGenerate}
      size="sm"
      title="Generate release notes from recent code changes on GitHub"
      type="button"
      variant="outline"
    >
      {isGenerating ? (
        <>
          <Spinner className="h-3 w-3 animate-spin" />
          Generating...
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

/**
 * Find the most recent tag before the current version
 */
function findPreviousTag(
  tags: Array<{ name: string; sha: string }>,
  currentVersion: string
): string | null {
  if (tags.length === 0) {
    return null;
  }

  // If we have a current version, find the tag before it
  if (currentVersion) {
    const currentIndex = tags.findIndex(
      (t) => t.name === currentVersion || t.name === `v${currentVersion}`
    );

    // If current version is found as a tag, return the next one (previous in time)
    if (currentIndex >= 0 && currentIndex + 1 < tags.length) {
      return tags[currentIndex + 1]?.name ?? null;
    }

    // Current version not found as tag — use the most recent tag as base
    return tags[0]?.name ?? null;
  }

  // No current version — use most recent tag as base
  return tags[0]?.name ?? null;
}

/**
 * Check if a tag name exists in the tags list
 */
function tagExists(tags: Array<{ name: string }>, tagName: string): boolean {
  return tags.some((t) => t.name === tagName || t.name === `v${tagName}`);
}
