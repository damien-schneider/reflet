"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

const ARRAY_PATTERN = /\[[\d,\s]*\]/;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Suggest feedback items that are related to a release based on its content.
 * Uses AI to match release notes against open feedback.
 */
export const suggestLinkedFeedback = action({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    suggestions: {
      feedbackId: string;
      title: string;
      status: string;
      voteCount: number;
    }[];
  }> => {
    const data = await ctx.runQuery(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId: args.releaseId }
    );

    if (!data) {
      return { suggestions: [] };
    }

    const { release, feedbackItems } = data as {
      release: { title: string; description?: string | null };
      feedbackItems: {
        _id: string;
        title: string;
        description?: string | null;
        status: string;
        voteCount: number;
      }[];
    };

    if (feedbackItems.length === 0) {
      return { suggestions: [] };
    }

    const feedbackList = feedbackItems
      .map(
        (f: { title: string; description?: string | null }, i: number) =>
          `[${i}] "${f.title}"${f.description ? `: ${f.description.slice(0, 100)}` : ""}`
      )
      .join("\n");

    const prompt = `You are a product manager assistant. Given a release/changelog entry and a list of user feedback items, identify which feedback items are addressed by this release.

Release title: ${release.title}
Release description: ${release.description ?? "No description provided"}

Feedback items:
${feedbackList}

Return ONLY a JSON array of indices (numbers) of feedback items that are addressed or related to this release. If none match, return an empty array [].
Only include strong matches where the release clearly addresses the feedback.

Response format: [0, 3, 7]`;

    try {
      const result = await generateText({
        model: openrouter("google/gemini-2.0-flash-001"),
        prompt,
        maxOutputTokens: 200,
      });

      const match = result.text.match(ARRAY_PATTERN);
      if (!match) {
        return { suggestions: [] };
      }

      const indices: number[] = JSON.parse(match[0]);
      const suggestions = indices
        .filter((i) => i >= 0 && i < feedbackItems.length)
        .map((i) => ({
          feedbackId: feedbackItems[i]._id,
          title: feedbackItems[i].title,
          status: feedbackItems[i].status,
          voteCount: feedbackItems[i].voteCount,
        }));

      return { suggestions };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Matching] Failed to suggest feedback: ${errorMsg}`);
      return { suggestions: [] };
    }
  },
});
