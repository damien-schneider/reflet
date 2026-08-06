"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
import { clusterCommitsWithAI } from "./ai_clustering";
import {
  type CommitData,
  getErrorMessage,
  MAX_COMMITS_PER_GROUP,
  MAX_GROUPS,
} from "./github";
import {
  buildGroupMap,
  type GroupMap,
  type GroupMapValue,
  groupCommitsByTagBoundaries,
  isTagVersion,
} from "./grouping";

interface CommitDoc {
  _id: Id<"retroactiveCommits">;
  commits: CommitData[];
  groupId: string;
}

interface Tag {
  name: string;
  sha: string;
}

async function buildGroupsForStrategy(
  strategy: string,
  hasTags: boolean,
  tags: Tag[],
  allCommitDocs: CommitDoc[],
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">
): Promise<{ groupMap: GroupMap; needsResave: boolean }> {
  if (strategy === "auto" && hasTags) {
    const allCommits = allCommitDocs.flatMap((doc) => doc.commits);
    const groupMap = groupCommitsByTagBoundaries(allCommits, tags);
    console.log(
      `[retroactive] Grouped ${allCommits.length} commits by ${tags.length} tag boundaries → ${groupMap.size} groups`
    );
    return { groupMap, needsResave: true };
  }

  if (strategy === "auto" && !hasTags) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateJobProgress,
      { currentStep: "Clustering commits by semantic similarity...", jobId }
    );
    return {
      groupMap: await clusterCommitsWithAI(allCommitDocs),
      needsResave: true,
    };
  }

  return { groupMap: buildGroupMap(allCommitDocs), needsResave: false };
}

async function resaveCommitsWithNewGroups(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  oldDocs: CommitDoc[],
  groupMap: GroupMap
): Promise<void> {
  for (const doc of oldDocs) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.deleteCommitDoc,
      { commitDocId: doc._id }
    );
  }
  for (const [groupId, data] of groupMap) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.saveCommitBatch,
      {
        commits: data.commits.slice(0, MAX_COMMITS_PER_GROUP),
        groupId,
        jobId,
      }
    );
  }
}

async function filterExistingVersions(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  entries: [string, GroupMapValue][]
): Promise<[string, GroupMapValue][]> {
  const existingVersions = await ctx.runQuery(
    internal.changelog.retroactive_mutations.getExistingVersions,
    { organizationId }
  );
  const versionSet = new Set(existingVersions);
  const kept = entries.filter(([groupId]) => !versionSet.has(groupId));

  const filtered = entries.length - kept.length;
  if (filtered > 0) {
    console.log(
      `[retroactive] Filtered out ${filtered} existing versions (${existingVersions.join(", ")})`
    );
  }

  return kept;
}

async function completeWithoutGroups(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  currentStep: string
): Promise<void> {
  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      completedAt: Date.now(),
      currentStep,
      jobId,
      status: "completed",
      totalGroups: 0,
    }
  );
}

/**
 * Phase 3: organize fetched commits into groups for release generation.
 */
export const groupCommitsPhase = internalAction({
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
      const allCommitDocs = await ctx.runQuery(
        internal.changelog.retroactive_mutations.getAllCommitsForJob,
        { jobId: args.jobId }
      );

      const totalCommits = allCommitDocs.reduce(
        (sum, doc) => sum + doc.commits.length,
        0
      );
      console.log(
        `[retroactive] groupCommitsPhase: ${allCommitDocs.length} commit docs, ${totalCommits} total commits, strategy=${job.groupingStrategy}, tags=${(job.tags ?? []).length}`
      );

      if (totalCommits === 0) {
        console.warn(
          "[retroactive] No commits found in retroactiveCommits — nothing was saved during fetch phase"
        );
        await completeWithoutGroups(
          ctx,
          args.jobId,
          "No commits were retrieved from GitHub. Check that the repository has commits on the configured branch."
        );
        return;
      }

      const tags = job.tags ?? [];
      const { groupMap, needsResave } = await buildGroupsForStrategy(
        job.groupingStrategy,
        tags.length > 1,
        tags,
        allCommitDocs,
        ctx,
        args.jobId
      );

      if (needsResave) {
        await resaveCommitsWithNewGroups(
          ctx,
          args.jobId,
          allCommitDocs,
          groupMap
        );
      }

      let groupEntries = Array.from(groupMap.entries());
      const groupCountBeforeFilter = groupEntries.length;

      if (job.skipExistingVersions) {
        groupEntries = await filterExistingVersions(
          ctx,
          job.organizationId,
          groupEntries
        );
      }

      groupEntries.sort((a, b) => b[1].dateTo - a[1].dateTo);
      groupEntries = groupEntries.slice(0, MAX_GROUPS);

      console.log(
        `[retroactive] Created ${groupEntries.length} groups (from ${groupCountBeforeFilter} before filtering)`
      );

      const groups = groupEntries.map(([groupId, data]) => ({
        commitCount: data.commits.length,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        id: groupId,
        status: "pending" as const,
        title: groupId,
        version: isTagVersion(groupId) ? groupId : undefined,
      }));

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobGroups,
        { groups, jobId: args.jobId }
      );

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          currentStep: `Organized ${groups.length} groups for release generation`,
          jobId: args.jobId,
          processedGroups: 0,
          totalGroups: groups.length,
        }
      );

      if (groups.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.changelog.retroactive_pipeline.notes_phase
            .generateNotesPhase,
          { groupIndex: 0, jobId: args.jobId }
        );
        return;
      }

      const hint =
        groupCountBeforeFilter > 0
          ? `${groupCountBeforeFilter} groups were found but all were filtered out (existing versions). Try unchecking "Skip existing versions".`
          : `No groups could be formed from ${totalCommits} commits.`;
      console.warn(`[retroactive] Completed with 0 groups: ${hint}`);
      await completeWithoutGroups(ctx, args.jobId, hint);
    } catch (error) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          error: `Failed to group commits: ${getErrorMessage(error)}`,
          jobId: args.jobId,
          status: "error",
        }
      );
    }
  },
});
