import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { MAX_SOURCE_COMMITS } from "../source";
import type { ReleaseCommit } from "../tableFields";

export async function loadActiveJob(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">
): Promise<Doc<"retroactiveJobs"> | null> {
  const job = await ctx.runQuery(
    internal.changelog.retroactive_mutations.getJobInternal,
    { jobId }
  );
  if (job?.status === "cancelled") {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.discardJobCommits,
      { jobId }
    );
    return null;
  }
  return job;
}

export async function saveGroupCommits(
  ctx: ActionCtx,
  jobId: Id<"retroactiveJobs">,
  groupId: string,
  commits: ReleaseCommit[]
): Promise<void> {
  for (let start = 0; start < commits.length; start += MAX_SOURCE_COMMITS) {
    await ctx.runMutation(
      internal.changelog.retroactive_mutations.saveCommitBatch,
      {
        commits: commits.slice(start, start + MAX_SOURCE_COMMITS),
        groupId,
        jobId,
      }
    );
  }
}
