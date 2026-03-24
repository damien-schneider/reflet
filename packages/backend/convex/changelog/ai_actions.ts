"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { action } from "../_generated/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_COMMITS_FOR_CONTEXT = 80;
const MAX_FEEDBACK_CANDIDATES = 100;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;

export const generateReleaseTitle = action({
  args: {
    description: v.string(),
    version: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("AI service not configured");
    }

    const prompt = `Generate a short, catchy release title (3-8 words) for the following release notes.
${args.version ? `Version: ${args.version}` : ""}

Release notes:
${args.description}

Instructions:
- Output ONLY the title text, nothing else
- Do not include the version number in the title
- Make it descriptive of the main theme of the release
- Keep it concise and engaging
- Do not use quotes around the title`;

    const result = await generateText({
      model: openrouter("anthropic/claude-sonnet-4"),
      prompt,
    });

    return result.text.trim();
  },
});

export const matchReleaseFeedback = action({
  args: {
    releaseNotes: v.string(),
    commits: v.array(
      v.object({
        sha: v.string(),
        message: v.string(),
        fullMessage: v.optional(v.string()),
        author: v.string(),
      })
    ),
    feedbackItems: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        status: v.string(),
        tags: v.array(v.string()),
      })
    ),
  },
  returns: v.array(
    v.object({
      feedbackId: v.string(),
      confidence: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      reason: v.string(),
    })
  ),
  handler: async (_ctx, args) => {
    const { releaseNotes, commits, feedbackItems } = args;

    if (feedbackItems.length === 0) {
      return [];
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("AI service not configured");
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

    const text = result.text.trim();
    const jsonMatch = text.match(JSON_OBJECT_REGEX);
    if (!jsonMatch) {
      throw new Error("AI returned non-JSON response");
    }

    let parsed: {
      matches: Array<{
        feedbackId: string;
        confidence: string;
        reason: string;
      }>;
    };
    try {
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(parsed.matches)) {
      throw new Error("AI returned invalid match format");
    }

    const validIds = new Set(feedbackItems.map((f) => f.id));
    const validConfidences = new Set(["high", "medium", "low"]);

    return parsed.matches
      .filter(
        (m) => validIds.has(m.feedbackId) && validConfidences.has(m.confidence)
      )
      .map((m) => ({
        feedbackId: m.feedbackId,
        confidence: m.confidence as "high" | "medium" | "low",
        reason: m.reason,
      }));
  },
});
