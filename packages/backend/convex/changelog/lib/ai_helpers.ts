import type { GroupMapValue } from "./commit_grouping";
import { buildGroupMapFromFlat } from "./commit_grouping";
import type { CommitData } from "./github_fetch";
import { getErrorMessage, MAX_COMMITS_PER_GROUP } from "./github_fetch";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4";
const MAX_COMMITS_FOR_CLUSTERING = 500;

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

interface AIClusterGroup {
  commits: number[];
  title: string;
}

export async function callOpenRouter(
  apiKey: string,
  prompt: string
): Promise<string> {
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

export async function clusterCommitsWithAI(
  commitDocs: Array<{ commits: CommitData[]; groupId: string }>
): Promise<Map<string, GroupMapValue>> {
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

    const result = new Map<string, GroupMapValue>();

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

export async function generateNotesForGroup(
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
