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

function isTagVersion(groupId: string): boolean {
  return VERSION_TAG_REGEX.test(groupId);
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  };
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
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.updateJobProgress,
        {
          jobId: args.jobId,
          status: "fetching_tags",
          currentStep: "Fetching tags from GitHub...",
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

      const allTags = await fetchAllTags(token, connection.repositoryFullName);

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
    const response = await fetch(url, { headers: buildAuthHeaders(token) });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tags: ${response.status} ${response.statusText}`
      );
    }

    const tags = (await response.json()) as GitHubTag[];
    for (const tag of tags) {
      allTags.push({ name: tag.name, sha: tag.commit.sha });
    }

    const linkHeader = response.headers.get("Link");
    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }

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

      const { token } = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );

      const tags = job.tags ?? [];
      const useTagStrategy = tags.length > 1;

      if (useTagStrategy) {
        await fetchCommitsByTags(
          ctx,
          args,
          tags,
          token,
          connection.repositoryFullName,
          job.fetchedCommits ?? 0
        );
      } else {
        await fetchCommitsByTime(
          ctx,
          args,
          token,
          connection.repositoryFullName,
          job.targetBranch,
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

async function fetchCommitsByTags(
  ctx: ActionCtx,
  args: { jobId: Id<"retroactiveJobs">; cursor?: number },
  tags: Array<{ name: string; sha: string }>,
  token: string,
  repoFullName: string,
  previouslyFetched: number
): Promise<void> {
  const startIndex = args.cursor ?? 0;
  const endIndex = Math.min(startIndex + TAG_PAIRS_PER_BATCH, tags.length - 1);
  let totalFetched = previouslyFetched;

  for (let i = startIndex; i < endIndex; i++) {
    const base = tags[i + 1];
    const head = tags[i];
    if (!(base && head)) {
      continue;
    }

    const url = `${GITHUB_API_URL}/repos/${repoFullName}/compare/${base.sha}...${head.sha}`;
    const response = await fetch(url, { headers: buildAuthHeaders(token) });
    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as GitHubCompareResponse;
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
  }

  await ctx.runMutation(
    internal.changelog.retroactive_mutations.updateJobProgress,
    {
      jobId: args.jobId,
      fetchedCommits: totalFetched,
      currentStep: `Fetched commits for ${endIndex} of ${tags.length - 1} tag pairs`,
    }
  );

  const hasMorePairs = endIndex < tags.length - 1;
  const nextAction = hasMorePairs
    ? internal.changelog.retroactive_actions.fetchCommitsPhase
    : internal.changelog.retroactive_actions.groupCommitsPhase;
  const nextArgs = hasMorePairs
    ? { jobId: args.jobId, cursor: endIndex }
    : { jobId: args.jobId };

  await ctx.scheduler.runAfter(0, nextAction, nextArgs);
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
  const response = await fetch(url, { headers: buildAuthHeaders(token) });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch commits: ${response.status} ${response.statusText}`
    );
  }

  const rawCommits = (await response.json()) as GitHubCommit[];
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
      currentStep: `Fetched ${totalFetched} commits`,
    }
  );

  const linkHeader = response.headers.get("Link");
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

      const hasTags = (job.tags ?? []).length > 1;
      const useAIClustering = job.groupingStrategy === "auto" && !hasTags;

      let groupMap: Map<
        string,
        { commits: CommitData[]; dateFrom: number; dateTo: number }
      >;

      if (useAIClustering) {
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateJobProgress,
          {
            jobId: args.jobId,
            currentStep: "Clustering commits by semantic similarity...",
          }
        );
        groupMap = await clusterCommitsWithAI(allCommitDocs);
      } else {
        groupMap = buildGroupMap(allCommitDocs);
      }

      let groupEntries = Array.from(groupMap.entries());

      if (job.skipExistingVersions) {
        const existingVersions = await ctx.runQuery(
          internal.changelog.retroactive_mutations.getExistingVersions,
          { organizationId: job.organizationId }
        );
        const versionSet = new Set(existingVersions);
        groupEntries = groupEntries.filter(
          ([groupId]) => !versionSet.has(groupId)
        );
      }

      groupEntries.sort((a, b) => b[1].dateTo - a[1].dateTo);
      groupEntries = groupEntries.slice(0, MAX_GROUPS);

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
        await ctx.runMutation(
          internal.changelog.retroactive_mutations.updateJobProgress,
          {
            jobId: args.jobId,
            status: "completed",
            completedAt: Date.now(),
            currentStep: "No groups to process",
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
      return result;
    }
  } catch {
    // Fall back to weekly grouping on AI failure
  }

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
