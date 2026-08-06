"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
import { getErrorMessage, MAX_COMMITS_PER_GROUP } from "./github";
import { generateNotesForGroup } from "./openrouter";

async function scheduleNextGroupOrFinish(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  currentIndex: number,
  totalGroups: number
): Promise<void> {
  const nextIndex = currentIndex + 1;
  if (nextIndex < totalGroups) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_pipeline.notes_phase.generateNotesPhase,
      { groupIndex: nextIndex, jobId }
    );
    return;
  }
  await ctx.scheduler.runAfter(
    0,
    internal.changelog.retroactive_pipeline.notes_phase.createReleasesPhase,
    { jobId }
  );
}

/**
 * Phase 4: generate release notes with AI, one group per invocation.
 */
export const generateNotesPhase = internalAction({
  args: {
    groupIndex: v.number(),
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(
      internal.changelog.retroactive_mutations.getJobInternal,
      { jobId: args.jobId }
    );

    if (!job || job.status === "cancelled" || !job.groups) {
      return;
    }

    const group = job.groups[args.groupIndex];
    if (group?.status !== "pending") {
      await scheduleNextGroupOrFinish(
        ctx,
        args.jobId,
        args.groupIndex,
        job.groups.length
      );
      return;
    }

    try {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          currentStep: `Generating notes for ${group.title} (${args.groupIndex + 1}/${job.groups.length})`,
          jobId: args.jobId,
          status: "generating",
        }
      );

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateGroupStatus,
        { groupIndex: args.groupIndex, jobId: args.jobId, status: "generating" }
      );

      const commitDocs = await ctx.runQuery(
        internal.changelog.retroactive_mutations.getCommitsForGroup,
        { groupId: group.id, jobId: args.jobId }
      );

      const allCommits = commitDocs.flatMap((doc) => doc.commits);

      if (allCommits.length === 0) {
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateGroupStatus,
          { groupIndex: args.groupIndex, jobId: args.jobId, status: "skipped" }
        );
        await scheduleNextGroupOrFinish(
          ctx,
          args.jobId,
          args.groupIndex,
          job.groups.length
        );
        return;
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not configured");
      }

      const { generatedTitle, generatedDescription } =
        await generateNotesForGroup(apiKey, allCommits, group);

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateGroupStatus,
        {
          generatedDescription,
          generatedTitle,
          groupIndex: args.groupIndex,
          jobId: args.jobId,
          status: "generated",
        }
      );

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        { jobId: args.jobId, processedGroups: (job.processedGroups ?? 0) + 1 }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateGroupStatus,
        {
          error: getErrorMessage(error),
          groupIndex: args.groupIndex,
          jobId: args.jobId,
          status: "error",
        }
      );
    }

    await scheduleNextGroupOrFinish(
      ctx,
      args.jobId,
      args.groupIndex,
      job.groups.length
    );
  },
});

/**
 * Phase 5: turn the generated notes into draft releases.
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
          currentStep: "Creating draft releases...",
          jobId: args.jobId,
          status: "creating_releases",
        }
      );

      const createdReleaseIds: Id<"releases">[] = [];

      for (let i = 0; i < job.groups.length; i++) {
        const group = job.groups[i];
        if (group?.status !== "generated") {
          continue;
        }

        const commitDocs = await ctx.runQuery(
          internal.changelog.retroactive_mutations.getCommitsForGroup,
          { groupId: group.id, jobId: args.jobId }
        );

        const allCommits = commitDocs.flatMap((doc) => doc.commits);

        const releaseId = await ctx.runMutation(
          internal.changelog.retroactive_mutations.createDraftRelease,
          {
            commits: allCommits.slice(0, MAX_COMMITS_PER_GROUP),
            description: group.generatedDescription ?? "",
            organizationId: job.organizationId,
            title: group.generatedTitle ?? group.title,
            version: group.version,
          }
        );

        createdReleaseIds.push(releaseId);

        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateGroupStatus,
          {
            groupIndex: i,
            jobId: args.jobId,
            releaseId,
            status: "created",
          }
        );
      }

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          completedAt: Date.now(),
          createdReleaseIds,
          currentStep: `Created ${createdReleaseIds.length} draft releases`,
          jobId: args.jobId,
          status: "completed",
        }
      );
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          error: `Failed to create releases: ${getErrorMessage(error)}`,
          jobId: args.jobId,
          status: "error",
        }
      );
    }
  },
});
