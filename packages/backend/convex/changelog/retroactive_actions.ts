"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  fetchCommitsByTags,
  fetchCommitsByTime,
} from "./retroactive_pipeline/fetch_commits";
import {
  fetchAllTags,
  fetchGitHub,
  GITHUB_API_URL,
  getErrorMessage,
} from "./retroactive_pipeline/github";

/**
 * Phase 1: fetch every tag of the connected repository.
 */
export const fetchTagsPhase = internalAction({
  args: { jobId: v.id("retroactiveJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(
      internal.changelog.retroactive_mutations.getJobInternal,
      { jobId: args.jobId }
    );

    if (!job || job.status === "cancelled") {
      return;
    }

    try {
      const connection = await ctx.runQuery(
        internal.integrations.github.queries.getConnectionInternal,
        { organizationId: job.organizationId }
      );

      if (!connection?.repositoryFullName) {
        throw new Error("No GitHub repository connected");
      }

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          currentStep: `Fetching tags from ${connection.repositoryFullName}...`,
          jobId: args.jobId,
          status: "fetching_tags",
        }
      );

      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const allTags = await fetchAllTags(token, connection.repositoryFullName);

      console.log(
        `[retroactive] fetchTagsPhase: found ${allTags.length} tags for ${connection.repositoryFullName}, branch=${job.targetBranch}`
      );

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          currentStep: `Found ${allTags.length} tags`,
          jobId: args.jobId,
          tags: allTags,
          totalTags: allTags.length,
        }
      );

      await ctx.scheduler.runAfter(
        0,
        internal.changelog.retroactive_actions.fetchCommitsPhase,
        { jobId: args.jobId }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          error: `Failed to fetch tags: ${getErrorMessage(error)}`,
          jobId: args.jobId,
          status: "error",
        }
      );
    }
  },
});

/**
 * The stored branch can be stale, so the repo's own default branch wins.
 * Doubles as the access check: a token that cannot read the repo fails here
 * with a clearer message than a later 404 on the commits endpoint.
 */
async function resolveEffectiveBranch(
  token: string,
  repoFullName: string,
  targetBranch: string
): Promise<string> {
  try {
    const { data: repoInfo } = await fetchGitHub<{
      default_branch: string;
      full_name: string;
      permissions?: Record<string, boolean>;
      private: boolean;
    }>(`${GITHUB_API_URL}/repos/${repoFullName}`, token);

    console.log(
      `[retroactive] Token access verified: repo=${repoInfo.full_name}, private=${repoInfo.private}, defaultBranch=${repoInfo.default_branch}, permissions=${JSON.stringify(repoInfo.permissions)}`
    );

    if (repoInfo.default_branch && repoInfo.default_branch !== targetBranch) {
      console.warn(
        `[retroactive] Branch mismatch: job has "${targetBranch}" but repo default is "${repoInfo.default_branch}". Using repo default.`
      );
      return repoInfo.default_branch;
    }

    return targetBranch;
  } catch (repoError) {
    console.error(
      `[retroactive] Token cannot access repo ${repoFullName}: ${getErrorMessage(repoError)}`
    );
    throw new Error(
      `GitHub App cannot access ${repoFullName}. Check that the repository is included in the App's repository access settings. Error: ${getErrorMessage(repoError)}`
    );
  }
}

/**
 * Phase 2: fetch commits, grouped either by tag pairs or by time window.
 */
export const fetchCommitsPhase = internalAction({
  args: {
    cursor: v.optional(v.number()),
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(
      internal.changelog.retroactive_mutations.getJobInternal,
      { jobId: args.jobId }
    );

    if (!job || job.status === "cancelled") {
      return;
    }

    try {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          currentStep: "Fetching commits...",
          jobId: args.jobId,
          status: "fetching_commits",
        }
      );

      const connection = await ctx.runQuery(
        internal.integrations.github.queries.getConnectionInternal,
        { organizationId: job.organizationId }
      );

      if (!connection?.repositoryFullName) {
        throw new Error("No GitHub repository connected");
      }

      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const effectiveBranch = await resolveEffectiveBranch(
        token,
        connection.repositoryFullName,
        job.targetBranch
      );

      const tags = job.tags ?? [];
      // "auto" and "weekly" always fetch by time — tag comparison breaks when
      // two tags share no common ancestor, e.g. after a force push
      const useTagStrategy = job.groupingStrategy === "tags" && tags.length > 1;

      console.log(
        `[retroactive] fetchCommitsPhase: fetchStrategy=${useTagStrategy ? "tags" : "time"}, tags=${tags.length}, cursor=${args.cursor ?? "none"}, groupingStrategy=${job.groupingStrategy}, branch=${effectiveBranch}`
      );

      if (!useTagStrategy) {
        await fetchCommitsByTime(
          ctx,
          args,
          token,
          connection.repositoryFullName,
          effectiveBranch,
          job.fetchedCommits ?? 0
        );
        return;
      }

      const fetched = await fetchCommitsByTags(
        ctx,
        args,
        tags,
        token,
        connection.repositoryFullName,
        job.fetchedCommits ?? 0
      );

      if (fetched === 0 && !args.cursor) {
        console.warn(
          "[retroactive] Tag-based fetching produced 0 commits, falling back to time-based fetching"
        );
        await fetchCommitsByTime(
          ctx,
          args,
          token,
          connection.repositoryFullName,
          effectiveBranch,
          0
        );
      }
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          error: `Failed to fetch commits: ${getErrorMessage(error)}`,
          jobId: args.jobId,
          status: "error",
        }
      );
    }
  },
});
