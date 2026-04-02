"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { handleGenerateNotes, handleGroupCommits } from "./lib/action_helpers";
import {
  type CommitData,
  fetchAllTags,
  fetchCommitsByTags,
  fetchCommitsByTime,
  getErrorMessage,
  MAX_COMMITS_PER_GROUP,
  verifyRepoAccess,
} from "./lib/github_fetch";

// ============================================
// ACTIONS
// ============================================

/**
 * Phase 1: Fetch all tags from GitHub repository
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
          jobId: args.jobId,
          status: "fetching_tags",
          currentStep: `Fetching tags from ${connection.repositoryFullName}...`,
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
          jobId: args.jobId,
          tags: allTags,
          totalTags: allTags.length,
          currentStep: `Found ${allTags.length} tags`,
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
          jobId: args.jobId,
          status: "error",
          error: `Failed to fetch tags: ${getErrorMessage(error)}`,
        }
      );
    }
  },
});

/**
 * Phase 2: Fetch commits from GitHub, grouped by tags or time periods.
 * Delegates to tag-based or time-based sub-actions.
 */
export const fetchCommitsPhase = internalAction({
  args: {
    jobId: v.id("retroactiveJobs"),
    cursor: v.optional(v.number()),
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
          jobId: args.jobId,
          status: "fetching_commits",
          currentStep: "Fetching commits...",
        }
      );

      const connection = await ctx.runQuery(
        internal.integrations.github.queries.getConnectionInternal,
        { organizationId: job.organizationId }
      );

      if (!connection?.repositoryFullName) {
        throw new Error("No GitHub repository connected");
      }

      console.log(
        `[retroactive] Connection: repo=${connection.repositoryFullName}, installationId=${connection.installationId}, defaultBranch=${connection.repositoryDefaultBranch ?? "(not set)"}`
      );

      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const effectiveBranch = await verifyRepoAccess(
        token,
        connection.repositoryFullName,
        job.targetBranch
      );

      const tags = job.tags ?? [];
      // Only use tag-based comparison when user explicitly chose "tags" strategy
      // For "auto" and "weekly", always fetch by time (more reliable — tag comparison
      // fails when tags have no common ancestor, e.g. after force pushes)
      const useTagStrategy = job.groupingStrategy === "tags" && tags.length > 1;

      console.log(
        `[retroactive] fetchCommitsPhase: fetchStrategy=${useTagStrategy ? "tags" : "time"}, tags=${tags.length}, cursor=${args.cursor ?? "none"}, groupingStrategy=${job.groupingStrategy}, branch=${effectiveBranch}`
      );

      if (useTagStrategy) {
        const fetched = await fetchCommitsByTags(
          ctx,
          args,
          tags,
          token,
          connection.repositoryFullName,
          job.fetchedCommits ?? 0
        );

        // If tag-based fetching produced 0 commits (e.g. no common ancestor),
        // fall back to time-based fetching to ensure we get the full history
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
      } else {
        await fetchCommitsByTime(
          ctx,
          args,
          token,
          connection.repositoryFullName,
          effectiveBranch,
          job.fetchedCommits ?? 0
        );
      }
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "error",
          error: `Failed to fetch commits: ${getErrorMessage(error)}`,
        }
      );
    }
  },
});

/**
 * Phase 3: Organize fetched commits into groups for release generation
 */
export const groupCommitsPhase = internalAction({
  args: { jobId: v.id("retroactiveJobs") },
  handler: handleGroupCommits,
});

/**
 * Phase 4: Generate release notes using AI for each group
 */
export const generateNotesPhase = internalAction({
  args: {
    jobId: v.id("retroactiveJobs"),
    groupIndex: v.number(),
  },
  handler: handleGenerateNotes,
});

/**
 * Phase 5: Create draft releases from generated notes
 */
export const createReleasesPhase = internalAction({
  args: { jobId: v.id("retroactiveJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(
      internal.changelog.retroactive_mutations.getJobInternal,
      { jobId: args.jobId }
    );

    if (!job || job.status === "cancelled" || !job.groups) {
      return;
    }

    try {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "creating_releases",
          currentStep: "Creating draft releases...",
        }
      );

      const createdReleaseIds: Id<"releases">[] = [];

      for (let i = 0; i < job.groups.length; i++) {
        const group = job.groups[i];
        if (!group || group.status !== "generated") {
          continue;
        }

        const commitDocs = await ctx.runQuery(
          internal.changelog.retroactive_mutations.getCommitsForGroup,
          { jobId: args.jobId, groupId: group.id }
        );

        const allCommits = commitDocs.flatMap(
          (doc: { commits: CommitData[] }) => doc.commits
        );

        const releaseId = await ctx.runMutation(
          internal.changelog.retroactive_mutations.createDraftRelease,
          {
            organizationId: job.organizationId,
            title: group.generatedTitle ?? group.title,
            description: group.generatedDescription ?? "",
            version: group.version,
            commits: allCommits.slice(0, MAX_COMMITS_PER_GROUP),
          }
        );

        createdReleaseIds.push(releaseId);

        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateGroupStatus,
          {
            jobId: args.jobId,
            groupIndex: i,
            status: "created",
            releaseId,
          }
        );
      }

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "completed",
          completedAt: Date.now(),
          createdReleaseIds,
          currentStep: `Created ${createdReleaseIds.length} draft releases`,
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "error",
          error: `Failed to create releases: ${getErrorMessage(error)}`,
        }
      );
    }
  },
});
