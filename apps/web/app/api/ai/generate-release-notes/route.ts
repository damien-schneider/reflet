import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_COMMITS_FOR_CONTEXT = 100;
const MAX_FILES_FOR_CONTEXT = 50;

const commitInputSchema = z.object({
  sha: z.string(),
  message: z.string(),
  fullMessage: z.string().optional(),
  author: z.string(),
});

const fileInputSchema = z.object({
  filename: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
});

const requestBodySchema = z.object({
  commits: z.array(commitInputSchema),
  files: z.array(fileInputSchema).optional(),
  version: z.string().optional(),
  previousVersion: z.string().optional(),
  repositoryName: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const body = requestBodySchema.parse(await request.json());
  const { commits, files, version, previousVersion, repositoryName } = body;

  if (!commits || commits.length === 0) {
    return Response.json({ error: "No commits provided" }, { status: 400 });
  }

  const commitSummary = commits
    .slice(0, MAX_COMMITS_FOR_CONTEXT)
    .map((c) => `- ${c.message} (${c.sha} by @${c.author})`)
    .join("\n");

  const fileSummary = files
    ? files
        .slice(0, MAX_FILES_FOR_CONTEXT)
        .map(
          (f) =>
            `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`
        )
        .join("\n")
    : "No file change data available";

  const versionInfo = version
    ? `Version: ${version}${previousVersion ? ` (from ${previousVersion})` : ""}`
    : "";

  const repoInfo = repositoryName ? `Repository: ${repositoryName}` : "";

  const prompt = `Generate professional, user-facing release notes in Markdown from the following git changes.

${versionInfo}
${repoInfo}

## Commits
${commitSummary}

## Files Changed
${fileSummary}

## Instructions
- Group changes into categories like **Features**, **Bug Fixes**, **Improvements**, **Breaking Changes** (only include categories that have items)
- Write from the user's perspective — explain what changed and why it matters, not the implementation details
- Use clear, concise bullet points
- Do NOT include commit SHAs, author names, or file paths unless they add context
- Do NOT add a title/heading — just the categorized content
- Skip merge commits, dependency bumps, and trivial changes unless they affect users
- If there are breaking changes, highlight them clearly
- Keep a professional but approachable tone
- Output only the markdown content, nothing else`;

  const result = streamText({
    model: openrouter("anthropic/claude-sonnet-4"),
    prompt,
  });

  return result.toTextStreamResponse();
}
