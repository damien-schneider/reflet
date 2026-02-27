import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_COMMITS_FOR_CONTEXT = 80;
const MAX_FEEDBACK_CANDIDATES = 100;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;

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
  try {
    const body = requestBodySchema.parse(await request.json());
    const { releaseNotes, commits, feedbackItems } = body;

    if (feedbackItems.length === 0) {
      return Response.json({ matches: [] });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const commitSummary = commits
      .slice(0, MAX_COMMITS_FOR_CONTEXT)
      .map(
        (c) =>
          `- ${c.message}${c.fullMessage && c.fullMessage !== c.message ? ` — ${c.fullMessage}` : ""} (${c.sha})`
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
${commitSummary || "No commit data available — match based on release notes only."}

## Candidate Feedback Items
${feedbackSummary}

## Task
Identify which feedback items are likely addressed, fixed, or resolved by the changes in this release.
Match based on semantic similarity between:
- The feedback title/description and the release notes content
- The feedback title/description and the commit messages
- The feedback tags and the nature of changes

Be generous with matching — include items that are even partially related or tangentially addressed.
Use "high" confidence for clearly addressed items, "medium" for likely related, and "low" for possibly related.

For each match, respond ONLY with a valid JSON object (no markdown, no code fences) in this exact format:
{"matches": [{"feedbackId": "<exact ID from brackets>", "confidence": "high|medium|low", "reason": "<max 15 words>"}]}

Sort results by confidence (high first, then medium, then low).`;

    const result = await generateText({
      model: openrouter("anthropic/claude-sonnet-4"),
      prompt,
    });

    // Parse JSON from text response
    const text = result.text.trim();
    const jsonMatch = text.match(JSON_OBJECT_REGEX);
    if (!jsonMatch) {
      return Response.json(
        { error: "AI returned non-JSON response" },
        { status: 502 }
      );
    }

    const parsed = matchResultSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      return Response.json(
        { error: "AI returned invalid match format" },
        { status: 502 }
      );
    }

    // Validate that returned feedbackIds actually exist in the candidates
    const validIds = new Set(feedbackItems.map((f) => f.id));
    const validMatches = parsed.data.matches.filter((m) =>
      validIds.has(m.feedbackId)
    );

    return Response.json({ matches: validMatches });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during matching";
    return Response.json({ error: message }, { status: 500 });
  }
}
