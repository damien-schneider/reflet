import { z } from "zod";
import type { ReleaseCommit } from "../tableFields";
import { generateWithAssistant } from "./assistant";
import { getErrorMessage } from "./github";
import { buildGroupMapFromFlat, type GroupMap } from "./grouping";

const clusterResponseSchema = z.array(
  z.object({ commits: z.array(z.number()), title: z.string() })
);

type AIClusterGroup = z.infer<typeof clusterResponseSchema>[number];

const MAX_COMMITS_FOR_CLUSTERING = 500;
const CODE_FENCE_JSON_REGEX = /```json?\n?/g;
const CODE_FENCE_REGEX = /```\n?/g;
const NON_SLUG_REGEX = /[^a-z0-9]+/g;

function buildClusteringPrompt(commits: ReleaseCommit[]): string {
  const commitList = commits
    .map((c, i) => `${i}: ${c.message} (${c.date.slice(0, 10)})`)
    .join("\n");

  const suggestedGroups = Math.max(
    2,
    Math.min(20, Math.ceil(commits.length / 12))
  );

  return `You are analyzing git commits to group them into logical product releases for a changelog.

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

Every commit must be assigned to exactly one group. Create as many or as few groups as makes sense — typically ${suggestedGroups} for ${commits.length} commits, but use your judgment.

Return ONLY the JSON array, no markdown fences or explanation.`;
}

function buildGroupsFromClusters(
  clusters: AIClusterGroup[],
  commits: ReleaseCommit[]
): GroupMap {
  const result: GroupMap = new Map();

  for (const [groupIdx, group] of clusters.entries()) {
    const groupCommits = group.commits
      .filter((i) => i >= 0 && i < commits.length)
      .map((i) => commits[i])
      .filter((c): c is ReleaseCommit => c !== undefined);

    if (groupCommits.length === 0) {
      continue;
    }

    const dates = groupCommits.map((c) => new Date(c.date).getTime());
    const slug = group.title.toLowerCase().replace(NON_SLUG_REGEX, "-");
    const groupId = `auto-${String(groupIdx + 1).padStart(2, "0")}-${slug.slice(0, 40)}`;

    result.set(groupId, {
      commits: groupCommits,
      dateFrom: Math.min(...dates),
      dateTo: Math.max(...dates),
    });
  }

  return result;
}

async function clusterWithAssistant(
  commits: ReleaseCommit[]
): Promise<GroupMap> {
  try {
    const raw = await generateWithAssistant(buildClusteringPrompt(commits));
    const cleaned = raw
      .replace(CODE_FENCE_JSON_REGEX, "")
      .replace(CODE_FENCE_REGEX, "")
      .trim();
    const clusters = clusterResponseSchema.parse(JSON.parse(cleaned));
    const result = buildGroupsFromClusters(clusters, commits);
    if (result.size > 0) {
      return result;
    }
    console.warn("[retroactive] AI clustering returned 0 valid groups");
  } catch (error) {
    console.warn(
      `[retroactive] AI clustering failed, falling back to heuristic: ${getErrorMessage(error)}`
    );
  }
  return buildGroupMapFromFlat(commits);
}

export async function clusterCommitsWithAI(
  commitDocs: Array<{ commits: ReleaseCommit[]; groupId: string }>
): Promise<GroupMap> {
  const allCommits = commitDocs.flatMap((doc) => doc.commits);
  if (allCommits.length === 0) {
    return new Map();
  }

  const clustered = await clusterWithAssistant(
    allCommits.slice(0, MAX_COMMITS_FOR_CLUSTERING)
  );
  const leftovers = allCommits.slice(MAX_COMMITS_FOR_CLUSTERING);
  for (const [groupId, group] of buildGroupMapFromFlat(leftovers)) {
    const existing = clustered.get(groupId);
    if (!existing) {
      clustered.set(groupId, group);
      continue;
    }
    existing.commits.push(...group.commits);
    existing.dateFrom = Math.min(existing.dateFrom, group.dateFrom);
    existing.dateTo = Math.max(existing.dateTo, group.dateTo);
  }
  return clustered;
}
