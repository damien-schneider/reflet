import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { clusterCommitsWithAI, generateNotesForGroup } from "./ai_helpers";
import {
  buildGroupMap,
  type GroupMapValue,
  groupCommitsByTagBoundaries,
} from "./commit_grouping";
import {
  type CommitData,
  getErrorMessage,
  isTagVersion,
  MAX_COMMITS_PER_GROUP,
} from "./github_fetch";

const MAX_GROUPS = 50;

interface CommitDoc {
  _id: Id<"retroactiveCommits">;
  commits: CommitData[];
  groupId: string;
}

async function buildGroupsForStrategy(
  strategy: string,
  hasTags: boolean,
  tags: Array<{ name: string; sha: string }>,
  allCommitDocs: CommitDoc[],
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">
): Promise<{
  groupMap: Map<string, GroupMapValue>;
  needsResave: boolean;
}> {
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
      { jobId, currentStep: "Clustering commits by semantic similarity..." }
    );
    const groupMap = await clusterCommitsWithAI(allCommitDocs);
    return { groupMap, needsResave: true };
  }

  return { groupMap: buildGroupMap(allCommitDocs), needsResave: false };
}

async function resaveCommitsWithNewGroups(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  oldDocs: CommitDoc[],
  groupMap: Map<string, GroupMapValue>
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
        jobId,
        groupId,
        commits: data.commits.slice(0, MAX_COMMITS_PER_GROUP),
      }
    );
  }
}

export async function scheduleNextGroupOrFinish(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  currentIndex: number,
  totalGroups: number
): Promise<void> {
  const nextIndex = currentIndex + 1;
  if (nextIndex < totalGroups) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.generateNotesPhase,
      { jobId, groupIndex: nextIndex }
    );
  } else {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.createReleasesPhase,
      { jobId }
    );
  }
}

/**
 * Handler for Phase 3: Organize fetched commits into groups for release generation.
 */
export async function handleGroupCommits(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs"> }
): Promise<void> {
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
      (sum: number, doc: CommitDoc) => sum + doc.commits.length,
      0
    );
    console.log(
      `[retroactive] groupCommitsPhase: ${allCommitDocs.length} commit docs, ${totalCommits} total commits, strategy=${job.groupingStrategy}, tags=${(job.tags ?? []).length}`
    );

    if (totalCommits === 0) {
      console.warn(
        "[retroactive] No commits found in retroactiveCommits — nothing was saved during fetch phase"
      );
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "completed",
          completedAt: Date.now(),
          totalGroups: 0,
          currentStep:
            "No commits were retrieved from GitHub. Check that the repository has commits on the configured branch.",
        }
      );
      return;
    }

    const tags = job.tags ?? [];
    const hasTags = tags.length > 1;

    const { groupMap, needsResave } = await buildGroupsForStrategy(
      job.groupingStrategy,
      hasTags,
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
      const existingVersions = await ctx.runQuery(
        internal.changelog.retroactive_mutations.getExistingVersions,
        { organizationId: job.organizationId }
      );
      const versionSet = new Set(existingVersions);
      groupEntries = groupEntries.filter(
        ([groupId]) => !versionSet.has(groupId)
      );

      const filtered = groupCountBeforeFilter - groupEntries.length;
      if (filtered > 0) {
        console.log(
          `[retroactive] Filtered out ${filtered} existing versions (${existingVersions.join(", ")})`
        );
      }
    }

    groupEntries.sort((a, b) => b[1].dateTo - a[1].dateTo);
    groupEntries = groupEntries.slice(0, MAX_GROUPS);

    console.log(
      `[retroactive] Created ${groupEntries.length} groups (from ${groupCountBeforeFilter} before filtering)`
    );

    const groups = groupEntries.map(([groupId, data]) => ({
      id: groupId,
      title: groupId,
      version: isTagVersion(groupId) ? groupId : undefined,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      commitCount: data.commits.length,
      status: "pending" as const,
    }));

    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateJobGroups,
      { jobId: args.jobId, groups }
    );

    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateJobProgress,
      {
        jobId: args.jobId,
        totalGroups: groups.length,
        processedGroups: 0,
        currentStep: `Organized ${groups.length} groups for release generation`,
      }
    );

    if (groups.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.changelog.retroactive_actions.generateNotesPhase,
        { jobId: args.jobId, groupIndex: 0 }
      );
    } else {
      const hint =
        groupCountBeforeFilter > 0
          ? `${groupCountBeforeFilter} groups were found but all were filtered out (existing versions). Try unchecking "Skip existing versions".`
          : `No groups could be formed from ${totalCommits} commits.`;
      console.warn(`[retroactive] Completed with 0 groups: ${hint}`);

      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "completed",
          completedAt: Date.now(),
          totalGroups: 0,
          currentStep: hint,
        }
      );
    }
  } catch (error) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateJobProgress,
      {
        jobId: args.jobId,
        status: "error",
        error: `Failed to group commits: ${getErrorMessage(error)}`,
      }
    );
  }
}

/**
 * Handler for Phase 4: Generate release notes using AI for each group.
 */
export async function handleGenerateNotes(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; groupIndex: number }
): Promise<void> {
  const job = await ctx.runQuery(
    internal.changelog.retroactive_mutations.getJobInternal,
    { jobId: args.jobId }
  );

  if (!job || job.status === "cancelled" || !job.groups) {
    return;
  }

  const group = job.groups[args.groupIndex];
  if (!group || group.status !== "pending") {
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
        jobId: args.jobId,
        status: "generating",
        currentStep: `Generating notes for ${group.title} (${args.groupIndex + 1}/${job.groups.length})`,
      }
    );

    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateGroupStatus,
      { jobId: args.jobId, groupIndex: args.groupIndex, status: "generating" }
    );

    const commitDocs = await ctx.runQuery(
      internal.changelog.retroactive_mutations.getCommitsForGroup,
      { jobId: args.jobId, groupId: group.id }
    );

    const allCommits = commitDocs.flatMap((doc: CommitDoc) => doc.commits);

    if (allCommits.length === 0) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateGroupStatus,
        { jobId: args.jobId, groupIndex: args.groupIndex, status: "skipped" }
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
        jobId: args.jobId,
        groupIndex: args.groupIndex,
        status: "generated",
        generatedTitle,
        generatedDescription,
      }
    );

    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateJobProgress,
      { jobId: args.jobId, processedGroups: (job.processedGroups ?? 0) + 1 }
    );

    await scheduleNextGroupOrFinish(
      ctx,
      args.jobId,
      args.groupIndex,
      job.groups.length
    );
  } catch (error) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.updateGroupStatus,
      {
        jobId: args.jobId,
        groupIndex: args.groupIndex,
        status: "error",
        error: getErrorMessage(error),
      }
    );
    await scheduleNextGroupOrFinish(
      ctx,
      args.jobId,
      args.groupIndex,
      job.groups.length
    );
  }
}
