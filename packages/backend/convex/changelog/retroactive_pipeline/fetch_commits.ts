import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import type { GitTag } from "../source";
import {
  fetchComparedCommits,
  fetchGitHub,
  GITHUB_API_URL,
  type GitHubCommit,
  getErrorMessage,
  TAG_PAIRS_PER_BATCH,
} from "./github";
import { groupCommitsByWeek } from "./grouping";
import { saveGroupCommits } from "./job_state";

interface PhaseArgs {
  cursor?: number;
  jobId: Id<"retroactiveJobs">;
}

/**
 * Returns the total commit count, including commits fetched by earlier batches.
 * Schedules the next batch or the grouping phase; a last batch that found
 * nothing returns without scheduling so the caller can fall back to time-based
 * fetching.
 */
export async function fetchCommitsByTags(
  ctx: ActionCtx,
  args: PhaseArgs,
  tags: GitTag[],
  token: string,
  repoFullName: string,
  previouslyFetched: number
): Promise<number> {
  const startIndex = args.cursor ?? 0;
  const endIndex = Math.min(startIndex + TAG_PAIRS_PER_BATCH, tags.length - 1);
  let totalFetched = previouslyFetched;
  let skippedPairs = 0;

  for (let i = startIndex; i < endIndex; i++) {
    const base = tags[i + 1];
    const head = tags[i];
    if (!(base && head)) {
      continue;
    }

    try {
      const { commits } = await fetchComparedCommits(
        token,
        repoFullName,
        base.sha,
        head.sha
      );
      await saveGroupCommits(ctx, args.jobId, head.name, commits);
      totalFetched += commits.length;
    } catch (error) {
      console.warn(
        `[retroactive] Failed to compare ${base.name}...${head.name}: ${getErrorMessage(error)}`
      );
      skippedPairs++;
    }
  }

  if (skippedPairs > 0) {
    console.warn(
      `[retroactive] Skipped ${skippedPairs} of ${endIndex - startIndex} tag pairs due to errors`
    );
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      currentStep: `Fetched commits for ${endIndex} of ${tags.length - 1} tag pairs (${totalFetched} commits)`,
      fetchedCommits: totalFetched,
      jobId: args.jobId,
    }
  );

  const hasMorePairs = endIndex < tags.length - 1;
  if (hasMorePairs) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchCommitsPhase,
      { cursor: endIndex, jobId: args.jobId }
    );
  } else if (totalFetched > 0) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_pipeline.group_phase.groupCommitsPhase,
      { jobId: args.jobId }
    );
  }

  return totalFetched;
}

export async function fetchCommitsByTime(
  ctx: ActionCtx,
  args: PhaseArgs,
  token: string,
  repoFullName: string,
  branch: string,
  previouslyFetched: number,
  tags: GitTag[]
): Promise<void> {
  let totalFetched = previouslyFetched;
  const page = (args.cursor ?? 0) + 1;

  const url = `${GITHUB_API_URL}/repos/${repoFullName}/commits?per_page=100&sha=${encodeURIComponent(branch)}&page=${page}`;
  console.log(`[retroactive] Fetching commits: ${url}`);

  const { data: rawCommits, linkHeader } = await fetchGitHub<GitHubCommit[]>(
    url,
    token
  );

  if (!Array.isArray(rawCommits)) {
    console.error(
      `[retroactive] Unexpected response type: ${typeof rawCommits}, value: ${JSON.stringify(rawCommits).slice(0, 200)}`
    );
    throw new Error(
      `GitHub commits API returned unexpected response type: ${typeof rawCommits}`
    );
  }

  console.log(
    `[retroactive] Fetched page ${page}: ${rawCommits.length} commits from ${repoFullName} (branch: ${branch})`
  );

  if (rawCommits.length === 0 && page === 1) {
    console.warn(
      `[retroactive] GitHub returned 0 commits for ${repoFullName} branch=${branch}. This may indicate a permissions issue with the GitHub App installation token.`
    );
  }

  for (const [weekKey, commits] of groupCommitsByWeek(
    rawCommits,
    new Set(tags.map((tag) => tag.sha))
  )) {
    await saveGroupCommits(ctx, args.jobId, weekKey, commits);
    totalFetched += commits.length;
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      currentStep: `Fetched ${totalFetched} commits (page ${page})`,
      fetchedCommits: totalFetched,
      jobId: args.jobId,
    }
  );

  const hasNextPage =
    (linkHeader?.includes('rel="next"') ?? false) && rawCommits.length > 0;

  if (hasNextPage) {
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchCommitsPhase,
      { cursor: page, jobId: args.jobId }
    );
    return;
  }

  await ctx.scheduler.runAfter(
    0,
    internal.changelog.retroactive_pipeline.group_phase.groupCommitsPhase,
    { jobId: args.jobId }
  );
}
