"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
import { MAX_SOURCE_COMMITS } from "../source";
import type { ReleaseCommit } from "../tableFields";
import { generateReleaseProse } from "./assistant";
import { getErrorMessage } from "./github";
import { loadActiveJob } from "./job_state";

async function loadGroupCommitsNewestFirst(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  groupId: string
): Promise<ReleaseCommit[]> {
  const commitDocs = await ctx.runQuery(
    internal.changelog.retroactive_mutations.getCommitsForGroup,
    { groupId, jobId }
  );
  return commitDocs
    .flatMap((doc) => doc.commits)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

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
    const job = await loadActiveJob(ctx, args.jobId);
    if (!job?.groups) {
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

      const allCommits = await loadGroupCommitsNewestFirst(
        ctx,
        args.jobId,
        group.id
      );

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

      const { description, title } = await generateReleaseProse({
        commits: allCommits.slice(0, MAX_SOURCE_COMMITS),
        totalCommits: allCommits.length,
        version: group.version ?? group.title,
      });

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateGroupStatus,
        {
          generatedDescription: description,
          generatedTitle: title || group.title,
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
    const job = await loadActiveJob(ctx, args.jobId);
    if (!job?.groups) {
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
      const tags = job.tags ?? [];

      for (const [groupIndex, group] of job.groups.entries()) {
        if (group.status !== "generated") {
          continue;
        }
        if (!(await loadActiveJob(ctx, args.jobId))) {
          return;
        }

        const allCommits = await loadGroupCommitsNewestFirst(
          ctx,
          args.jobId,
          group.id
        );
        const tagIndex = tags.findIndex((tag) => tag.name === group.version);
        const headTag = tags[tagIndex];

        const releaseId = await ctx.runMutation(
          internal.changelog.retroactive_mutations.createDraftRelease,
          {
            description: group.generatedDescription ?? "",
            organizationId: job.organizationId,
            snapshot: {
              baseRef: headTag ? tags[tagIndex + 1]?.name : undefined,
              commits: allCommits.slice(0, MAX_SOURCE_COMMITS),
              headRef: headTag?.name,
              headSha: headTag?.sha,
              totalCommits: allCommits.length,
            },
            title: group.generatedTitle ?? group.title,
            version: group.version,
          }
        );

        if (releaseId) {
          createdReleaseIds.push(releaseId);
        }
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateGroupStatus,
          releaseId
            ? { groupIndex, jobId: args.jobId, releaseId, status: "created" }
            : {
                error: `Version ${group.version} already exists`,
                groupIndex,
                jobId: args.jobId,
                status: "skipped",
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
