import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_COMMITS_FOR_CONTEXT = 80;
const MAX_FEEDBACK_CANDIDATES = 100;

const requestBodySchema = z.object({
  releaseNotes: z.string(),
  commits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      fullMessage: z.string().optional(),
      author: z.string(),
    })
  ),
  feedbackItems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      status: z.string(),
      tags: z.array(z.string()),
    })
  ),
});

const matchResultSchema = z.object({
  matches: z.array(
    z.object({
      feedbackId: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    })
  ),
});

export async function POST(request: Request): Promise<Response> {
  const body = requestBodySchema.parse(await request.json());
  const { releaseNotes, commits, feedbackItems } = body;

  if (feedbackItems.length === 0) {
    return Response.json({ matches: [] });
  }

  const commitSummary = commits
    .slice(0, MAX_COMMITS_FOR_CONTEXT)
    .map(
      (c) =>
        `- ${c.message}${c.fullMessage ? ` — ${c.fullMessage}` : ""} (${c.sha})`
    )
    .join("\n");

  const feedbackSummary = feedbackItems
    .slice(0, MAX_FEEDBACK_CANDIDATES)
    .map(
      (f) =>
        `[${f.id}] "${f.title}"${f.description ? ` — ${f.description.slice(0, 200)}` : ""} (status: ${f.status}, tags: ${f.tags.join(", ") || "none"})`
    )
    .join("\n");

  const prompt = `You are analyzing a software release to find which user feedback items were addressed by this release.

## Release Notes
${releaseNotes}

## Commits in this Release
${commitSummary}

## Candidate Feedback Items
${feedbackSummary}

## Task
Identify which feedback items are likely addressed, fixed, or resolved by the changes in this release.
Match based on semantic similarity between:
- The feedback title/description and the release notes content
- The feedback title/description and the commit messages
- The feedback tags and the nature of changes

Return ONLY feedback items that are genuinely related. Do not force matches.

For each match, provide:
- feedbackId: the ID in brackets from the candidate list
- confidence: "high" (clearly addressed), "medium" (likely related), or "low" (possibly related)
- reason: a brief explanation (max 15 words) of why this feedback matches

Sort results by confidence (high first, then medium, then low).`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    output: Output.object({ schema: matchResultSchema }),
    prompt,
  });

  return Response.json(result.output);
}
