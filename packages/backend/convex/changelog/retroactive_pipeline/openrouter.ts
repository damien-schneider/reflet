import { type CommitData, MAX_COMMITS_PER_GROUP } from "./github";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4";

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function callOpenRouter(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    body: JSON.stringify({
      messages: [{ content: prompt, role: "user" }],
      model: OPENROUTER_MODEL,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content?.trim() ?? "";
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

  return { generatedDescription, generatedTitle };
}
