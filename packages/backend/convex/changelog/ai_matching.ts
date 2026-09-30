"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth/auth";

const ARRAY_PATTERN = /\[[\d,\s]*\]/;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const organizationId = await ctx.runQuery(
      internal.changelog.ai_matching_helpers.getReleaseOrganizationId,
      { releaseId: args.releaseId }
    );
    if (!organizationId) {
      return { suggestions: [] };
    }

    await ctx.runMutation(internal.ai.usage_gate.consumeAiGenerationForUser, {
      organizationId,
      userId: user._id,
    });

    const data = await ctx.runQuery(
      internal.changelog.ai_matching_helpers.getReleaseAndFeedback,
      { releaseId: args.releaseId }
    );

    if (!data || data.feedbackItems.length === 0) {
      return { suggestions: [] };
    }

    const { release, feedbackItems } = data;
    const feedbackList = feedbackItems
      .map(
        (f, i) =>
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
        maxOutputTokens: 200,
        model: openrouter("google/gemini-2.0-flash-001"),
        prompt,
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
          status: feedbackItems[i].status,
          title: feedbackItems[i].title,
          voteCount: feedbackItems[i].voteCount,
        }));

      return { suggestions };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Matching] Failed to suggest feedback: ${errorMsg}`);
      return { suggestions: [] };
    }
  },
  returns: v.object({
    suggestions: v.array(
      v.object({
        feedbackId: v.string(),
        status: v.string(),
        title: v.string(),
        voteCount: v.number(),
      })
    ),
  }),
});
