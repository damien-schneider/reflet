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

function groupCommitsByMonth(
  rawCommits: GitHubCommit[]
): Map<string, CommitData[]> {
  const monthGroups = new Map<string, CommitData[]>();

  for (const commit of rawCommits) {
    const formatted = formatCommit(commit);
    const date = new Date(formatted.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const existing = monthGroups.get(monthKey) ?? [];
    existing.push(formatted);
    monthGroups.set(monthKey, existing);
  }

  return monthGroups;
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
  const monthGroups = groupCommitsByMonth(rawCommits);

  for (const [monthKey, commits] of monthGroups) {
    if (commits.length > 0) {
      await ctx.runMutation(
        internal.changelog.retroactive_mutations.saveCommitBatch,
        {
          jobId: args.jobId,
          groupId: monthKey,
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

      const groupMap = buildGroupMap(allCommitDocs);
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
