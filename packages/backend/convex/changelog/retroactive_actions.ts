"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";

// GitHub API constants
const GITHUB_API_URL = "https://api.github.com";
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;
const MAX_COMMITS_PER_GROUP = 100;
const MAX_GROUPS = 50;
const TAG_PAIRS_PER_BATCH = 10;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4";

// Types for GitHub API responses
interface GitHubTag {
  commit: { sha: string };
  name: string;
}

interface GitHubCommit {
  author?: { login: string } | null;
  commit: {
    author: { date: string; name: string };
    message: string;
  };
  sha: string;
}

interface GitHubCompareResponse {
  commits: GitHubCommit[];
}

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

interface CommitData {
  author: string;
  date: string;
  fullMessage: string;
  message: string;
  sha: string;
}

// ============================================
// HELPERS
// ============================================

function formatCommit(commit: GitHubCommit): CommitData {
  const firstLine = commit.commit.message.split("\n")[0] ?? "";
  return {
    sha: commit.sha,
    message: firstLine,
    fullMessage: commit.commit.message,
    author: commit.author?.login ?? commit.commit.author.name,
    date: commit.commit.author.date,
  };
}

const VERSION_TAG_REGEX = /^v?\d/;
const QUERY_STRING_REGEX = /\?.*/;

function isTagVersion(groupId: string): boolean {
  return VERSION_TAG_REGEX.test(groupId);
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch from GitHub API with error handling and response body extraction.
 * Returns the parsed JSON on success, throws a descriptive error on failure.
 */
async function fetchGitHub<T>(
  url: string,
  token: string
): Promise<{ data: T; linkHeader: string | null }> {
  const response = await fetch(url, { headers: buildAuthHeaders(token) });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      // ignore body read failure
    }
    throw new Error(
      `GitHub API ${response.status} ${response.statusText} for ${url.replace(QUERY_STRING_REGEX, "")}: ${errorBody.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as T;
  const linkHeader = response.headers.get("Link");
  return { data, linkHeader };
}

async function callOpenRouter(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content?.trim() ?? "";
}

function groupCommitsByWeek(
  rawCommits: GitHubCommit[]
): Map<string, CommitData[]> {
  const weekGroups = new Map<string, CommitData[]>();

  for (const commit of rawCommits) {
    const formatted = formatCommit(commit);
    const date = new Date(formatted.date);
    const weekKey = getISOWeekKey(date);

    const existing = weekGroups.get(weekKey) ?? [];
    existing.push(formatted);
    weekGroups.set(weekKey, existing);
  }

  return weekGroups;
}

function getISOWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

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

async function fetchAllTags(
  token: string,
  repoFullName: string
): Promise<Array<{ name: string; sha: string }>> {
  const allTags: Array<{ name: string; sha: string }> = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${GITHUB_API_URL}/repos/${repoFullName}/tags?per_page=100&page=${page}`;
    const { data: tags, linkHeader } = await fetchGitHub<GitHubTag[]>(
      url,
      token
    );

    for (const tag of tags) {
      allTags.push({ name: tag.name, sha: tag.commit.sha });
    }

    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }

  console.log(
    `[retroactive] Fetched ${allTags.length} tags from ${repoFullName}`
  );
  return allTags;
}

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

      // Verify the installation token has access to the repo
      let effectiveBranch = job.targetBranch;
      const repoCheckUrl = `${GITHUB_API_URL}/repos/${connection.repositoryFullName}`;
      try {
        const { data: repoInfo } = await fetchGitHub<{
          default_branch: string;
          full_name: string;
          permissions?: Record<string, boolean>;
          private: boolean;
        }>(repoCheckUrl, token);
        console.log(
          `[retroactive] Token access verified: repo=${repoInfo.full_name}, private=${repoInfo.private}, defaultBranch=${repoInfo.default_branch}, permissions=${JSON.stringify(repoInfo.permissions)}`
        );

        // Use the actual default branch from GitHub if our stored one differs
        effectiveBranch =
          repoInfo.default_branch &&
          repoInfo.default_branch !== job.targetBranch
            ? repoInfo.default_branch
            : job.targetBranch;

        if (effectiveBranch !== job.targetBranch) {
          console.warn(
            `[retroactive] Branch mismatch: job has "${job.targetBranch}" but repo default is "${effectiveBranch}". Using repo default.`
          );
        }
      } catch (repoError) {
        console.error(
          `[retroactive] Token cannot access repo ${connection.repositoryFullName}: ${getErrorMessage(repoError)}`
        );
        throw new Error(
          `GitHub App cannot access ${connection.repositoryFullName}. Check that the repository is included in the App's repository access settings. Error: ${getErrorMessage(repoError)}`
        );
      }

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
 * Returns the total number of commits fetched (including previously fetched).
 * Schedules next batch or groupCommitsPhase if there are more pairs.
 * Returns without scheduling if this is the last batch (caller handles fallback).
 */
async function fetchCommitsByTags(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; cursor?: number },
  tags: Array<{ name: string; sha: string }>,
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

    const url = `${GITHUB_API_URL}/repos/${repoFullName}/compare/${base.sha}...${head.sha}`;

    try {
      const { data } = await fetchGitHub<GitHubCompareResponse>(url, token);
      const commits = data.commits
        .slice(0, MAX_COMMITS_PER_GROUP)
        .map(formatCommit);

      if (commits.length > 0) {
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.saveCommitBatch,
          { jobId: args.jobId, groupId: head.name, commits }
        );
        totalFetched += commits.length;
      }
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
      jobId: args.jobId,
      fetchedCommits: totalFetched,
      currentStep: `Fetched commits for ${endIndex} of ${tags.length - 1} tag pairs (${totalFetched} commits)`,
    }
  );

  const hasMorePairs = endIndex < tags.length - 1;
  if (hasMorePairs) {
    // More tag pairs to process — schedule next batch
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchCommitsPhase,
      { jobId: args.jobId, cursor: endIndex }
    );
  } else if (totalFetched > 0) {
    // All pairs done and we have commits — proceed to grouping
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.groupCommitsPhase,
      { jobId: args.jobId }
    );
  }
  // If totalFetched === 0 and no more pairs, return to caller for fallback

  return totalFetched;
}

async function fetchCommitsByTime(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; cursor?: number },
  token: string,
  repoFullName: string,
  branch: string,
  previouslyFetched: number
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

  const weekGroups = groupCommitsByWeek(rawCommits);

  for (const [weekKey, commits] of weekGroups) {
    if (commits.length > 0) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.saveCommitBatch,
        {
          jobId: args.jobId,
          groupId: weekKey,
          commits: commits.slice(0, MAX_COMMITS_PER_GROUP),
        }
      );
      totalFetched += commits.length;
    }
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      jobId: args.jobId,
      fetchedCommits: totalFetched,
      currentStep: `Fetched ${totalFetched} commits (page ${page})`,
    }
  );

  const hasNextPage =
    (linkHeader?.includes('rel="next"') ?? false) && rawCommits.length > 0;

  const nextAction = hasNextPage
    ? internal.changelog.retroactive_actions.fetchCommitsPhase
    : internal.changelog.retroactive_actions.groupCommitsPhase;
  const nextArgs = hasNextPage
    ? { jobId: args.jobId, cursor: page }
    : { jobId: args.jobId };

  await ctx.scheduler.runAfter(0, nextAction, nextArgs);
}

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
  groupMap: Map<
    string,
    { commits: CommitData[]; dateFrom: number; dateTo: number }
  >;
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
  groupMap: Map<
    string,
    { commits: CommitData[]; dateFrom: number; dateTo: number }
  >
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

/**
 * Phase 3: Organize fetched commits into groups for release generation
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

      // Re-save commits under new groupIds when regrouping was done
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
  },
});

function buildGroupMap(
  commitDocs: Array<{ commits: CommitData[]; groupId: string }>
): Map<string, { commits: CommitData[]; dateFrom: number; dateTo: number }> {
  const groupMap = new Map<
    string,
    { commits: CommitData[]; dateFrom: number; dateTo: number }
  >();

  for (const doc of commitDocs) {
    const existing = groupMap.get(doc.groupId);
    const dates = doc.commits.map((c) => new Date(c.date).getTime());
    const docDateFrom = Math.min(...dates);
    const docDateTo = Math.max(...dates);

    if (existing) {
      existing.commits.push(...doc.commits);
      existing.dateFrom = Math.min(existing.dateFrom, docDateFrom);
      existing.dateTo = Math.max(existing.dateTo, docDateTo);
    } else {
      groupMap.set(doc.groupId, {
        commits: [...doc.commits],
        dateFrom: docDateFrom,
        dateTo: docDateTo,
      });
    }
  }

  return groupMap;
}

/**
 * Group commits by tag boundaries. Each tag defines a release boundary.
 * Commits between two consecutive tags belong to the newer tag's group.
 * Commits after the newest tag go into an "unreleased" group.
 */
function groupCommitsByTagBoundaries(
  commits: CommitData[],
  tags: Array<{ name: string; sha: string }>
): Map<string, { commits: CommitData[]; dateFrom: number; dateTo: number }> {
  const result = new Map<
    string,
    { commits: CommitData[]; dateFrom: number; dateTo: number }
  >();

  // Build a sha→tag lookup
  const shaToTag = new Map<string, string>();
  for (const tag of tags) {
    shaToTag.set(tag.sha, tag.name);
  }

  // Sort commits by date (newest first, matching tag order)
  const sorted = [...commits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Walk through commits, assigning them to the current tag group
  let currentGroup = "unreleased";

  for (const commit of sorted) {
    const tagName = shaToTag.get(commit.sha);
    if (tagName) {
      currentGroup = tagName;
    }

    const ts = new Date(commit.date).getTime();
    const existing = result.get(currentGroup);
    if (existing) {
      existing.commits.push(commit);
      existing.dateFrom = Math.min(existing.dateFrom, ts);
      existing.dateTo = Math.max(existing.dateTo, ts);
    } else {
      result.set(currentGroup, { commits: [commit], dateFrom: ts, dateTo: ts });
    }
  }

  // Remove "unreleased" group if empty (all commits are within tag boundaries)
  const unreleased = result.get("unreleased");
  if (unreleased && unreleased.commits.length === 0) {
    result.delete("unreleased");
  }

  return result;
}

interface AIClusterGroup {
  commits: number[];
  title: string;
}

const MAX_COMMITS_FOR_CLUSTERING = 500;

async function clusterCommitsWithAI(
  commitDocs: Array<{ commits: CommitData[]; groupId: string }>
): Promise<
  Map<string, { commits: CommitData[]; dateFrom: number; dateTo: number }>
> {
  const allCommits = commitDocs.flatMap((doc) => doc.commits);

  if (allCommits.length === 0) {
    return new Map();
  }

  const commitsForClustering = allCommits.slice(0, MAX_COMMITS_FOR_CLUSTERING);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return buildGroupMapFromFlat(commitsForClustering);
  }

  const commitList = commitsForClustering
    .map((c, i) => `${i}: ${c.message} (${c.date.slice(0, 10)})`)
    .join("\n");

  const prompt = `You are analyzing git commits to group them into logical product releases for a changelog.

## Key Principles
- Group by SEMANTIC RELATEDNESS, NOT by time. Commits from the same week can be in different releases, and commits weeks apart can be in the same release if they relate to the same feature.
- Look at the commit message content: what area of the codebase does it touch? What feature or fix is it about? Common prefixes like "feat:", "fix:", "refactor:", "chore:" and path references help identify related work.
- A release should tell a coherent story — "we improved authentication" or "we redesigned the dashboard" — not "here's what happened this week".
- Prefer fewer, more meaningful releases over many tiny ones. A single focused commit can be its own release if it's significant (e.g., a breaking change), but group small related commits together.
- Ideal group size: 3-30 commits, but 1-2 commit groups are fine for significant standalone changes.

## Commits (index: message (date))
${commitList}

## Instructions
Return a JSON array of groups. Each group has:
- "title": A short, user-facing release title describing the theme (e.g., "Authentication Improvements", "Dashboard Redesign", "Performance Optimizations")
- "commits": Array of commit indices (numbers from the list above)

Every commit must be assigned to exactly one group. Create as many or as few groups as makes sense — typically ${Math.max(2, Math.min(20, Math.ceil(commitsForClustering.length / 12)))} for ${commitsForClustering.length} commits, but use your judgment.

Return ONLY the JSON array, no markdown fences or explanation.`;

  try {
    const raw = await callOpenRouter(apiKey, prompt);
    const cleaned = raw
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const groups = JSON.parse(cleaned) as AIClusterGroup[];

    const result = new Map<
      string,
      { commits: CommitData[]; dateFrom: number; dateTo: number }
    >();

    for (const [groupIdx, group] of groups.entries()) {
      const groupCommits = group.commits
        .filter((i) => i >= 0 && i < commitsForClustering.length)
        .map((i) => commitsForClustering[i])
        .filter((c): c is CommitData => c !== undefined);

      if (groupCommits.length === 0) {
        continue;
      }

      const dates = groupCommits.map((c) => new Date(c.date).getTime());
      const groupId = `auto-${String(groupIdx + 1).padStart(2, "0")}-${group.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40)}`;

      result.set(groupId, {
        commits: groupCommits,
        dateFrom: Math.min(...dates),
        dateTo: Math.max(...dates),
      });
    }

    if (result.size > 0) {
      console.log(
        `[retroactive] AI clustering created ${result.size} groups from ${commitsForClustering.length} commits`
      );
      return result;
    }
    console.warn("[retroactive] AI clustering returned 0 valid groups");
  } catch (error) {
    console.warn(
      `[retroactive] AI clustering failed, falling back to heuristic: ${getErrorMessage(error)}`
    );
  }

  console.log(
    `[retroactive] Using heuristic fallback grouping for ${commitsForClustering.length} commits`
  );
  return buildGroupMapFromFlat(commitsForClustering);
}

const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(([^)]+)\))?[!:]?\s*/i;
const BRACKET_AREA_REGEX = /^\[([^\]]+)\]/;
const SLASH_AREA_REGEX = /^(\w+)\//;

interface GroupMapValue {
  commits: CommitData[];
  dateFrom: number;
  dateTo: number;
}

/**
 * Fallback grouping when AI clustering is unavailable.
 * Groups by conventional commit scope/type, then by common path prefixes
 * extracted from commit messages. Falls back to weekly only as last resort.
 */
function buildGroupMapFromFlat(
  commits: CommitData[]
): Map<string, GroupMapValue> {
  const groups = new Map<string, GroupMapValue>();

  for (const commit of commits) {
    const groupKey = inferGroupKey(commit);
    addCommitToGroup(groups, groupKey, commit);
  }

  return mergeSmallGroups(groups);
}

function addCommitToGroup(
  groups: Map<string, GroupMapValue>,
  key: string,
  commit: CommitData
): void {
  const ts = new Date(commit.date).getTime();
  const existing = groups.get(key);
  if (existing) {
    existing.commits.push(commit);
    existing.dateFrom = Math.min(existing.dateFrom, ts);
    existing.dateTo = Math.max(existing.dateTo, ts);
  } else {
    groups.set(key, { commits: [commit], dateFrom: ts, dateTo: ts });
  }
}

function mergeSmallGroups(
  groups: Map<string, GroupMapValue>
): Map<string, GroupMapValue> {
  const entries = Array.from(groups.entries());
  const largeEntries = entries.filter(([, d]) => d.commits.length >= 2);
  const smallEntries = entries.filter(([, d]) => d.commits.length < 2);

  const merged = new Map<string, GroupMapValue>();
  for (const [key, data] of largeEntries) {
    merged.set(key, data);
  }

  for (const [key, data] of smallEntries) {
    const bestKey = findNearestGroup(key, data, largeEntries);
    if (bestKey) {
      const target = merged.get(bestKey) ?? groups.get(bestKey);
      if (target) {
        target.commits.push(...data.commits);
        target.dateFrom = Math.min(target.dateFrom, data.dateFrom);
        target.dateTo = Math.max(target.dateTo, data.dateTo);
        merged.set(bestKey, target);
        continue;
      }
    }
    merged.set(key, data);
  }

  return merged;
}

function findNearestGroup(
  excludeKey: string,
  data: GroupMapValue,
  candidates: [string, GroupMapValue][]
): string | undefined {
  let bestKey: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [otherKey, otherData] of candidates) {
    if (otherKey === excludeKey) {
      continue;
    }
    const dist = Math.abs(data.dateTo - otherData.dateTo);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = otherKey;
    }
  }
  return bestKey;
}

function inferGroupKey(commit: CommitData): string {
  const match = CONVENTIONAL_COMMIT_REGEX.exec(commit.message);
  if (match) {
    const type = (match[1] ?? "").toLowerCase();
    const scope = (match[2] ?? "").toLowerCase();
    return scope ? `${type}-${scope}` : type;
  }

  const bracketMatch = BRACKET_AREA_REGEX.exec(commit.message);
  if (bracketMatch) {
    return (bracketMatch[1] ?? "misc").toLowerCase();
  }

  const slashMatch = SLASH_AREA_REGEX.exec(commit.message);
  if (slashMatch) {
    return (slashMatch[1] ?? "misc").toLowerCase();
  }

  return `week-${getISOWeekKey(new Date(commit.date))}`;
}

/**
 * Phase 4: Generate release notes using AI for each group
 */
export const generateNotesPhase = internalAction({
  args: {
    jobId: v.id("retroactiveJobs"),
    groupIndex: v.number(),
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

      const allCommits = commitDocs.flatMap((doc) => doc.commits);

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
  },
});

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

async function generateNotesForGroup(
  apiKey: string,
  commits: CommitData[],
  group: { id: string; title: string; version?: string }
): Promise<{ generatedDescription: string; generatedTitle: string }> {
  const commitSummary = commits
    .slice(0, MAX_COMMITS_PER_GROUP)
    .map((c) => `- ${c.message} (${c.sha.slice(0, 7)} by ${c.author})`)
    .join("\n");

  const notesPrompt = `Generate professional, user-facing release notes in Markdown from the following git changes.

Version: ${group.version ?? group.title}

## Commits
${commitSummary}

## Instructions
- Group changes into categories like **Features**, **Bug Fixes**, **Improvements**, **Breaking Changes** (only include categories that have items)
- Write from the user's perspective - explain what changed and why it matters, not the implementation details
- Use clear, concise bullet points
- Do NOT include commit SHAs, author names, or file paths unless they add context
- Do NOT add a title/heading - just the categorized content
- Skip merge commits, dependency bumps, and trivial changes unless they affect users
- If there are breaking changes, highlight them clearly
- Keep a professional but approachable tone
- Output only the markdown content, nothing else`;

  const generatedDescription = await callOpenRouter(apiKey, notesPrompt);

  const titlePrompt = `Generate a short, catchy release title (3-8 words) for the following release notes.
${group.version ? `Version: ${group.version}` : ""}

Release notes:
${generatedDescription}

Instructions:
- Output ONLY the title text, nothing else
- Do not include the version number in the title
- Make it descriptive of the main theme of the release
- Keep it concise and engaging
- Do not use quotes around the title`;

  const generatedTitle =
    (await callOpenRouter(apiKey, titlePrompt)) || group.title;

  return { generatedTitle, generatedDescription };
}

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

        const allCommits = commitDocs.flatMap((doc) => doc.commits);

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
