import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import { feedbackClarificationAgent } from "../ai/agent";
import { getAuthUser } from "../shared/utils";

// Regex to extract JSON from AI response (may include markdown code blocks)
const JSON_EXTRACT_REGEX = /\{[\s\S]*\}/;

// ============================================
// QUERIES
// ============================================

/**
 * Get AI difficulty estimation for a feedback item
 */
export const getDifficultyEstimate = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    return {
      aiDifficultyScore: feedback.aiDifficultyScore,
      aiDifficultyReasoning: feedback.aiDifficultyReasoning,
      aiDifficultyGeneratedAt: feedback.aiDifficultyGeneratedAt,
      hasAiDifficulty: Boolean(feedback.aiDifficultyScore),
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Initiate AI difficulty estimation for a feedback item (admin only)
 */
export const initiateDifficultyEstimate = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can generate AI difficulty estimates");
    }

    // Schedule the action to generate difficulty estimate
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.clarification_difficulty.generateDifficultyEstimate,
      {
        feedbackId: args.feedbackId,
      }
    );

    return { started: true };
  },
});

/**
 * Internal mutation to save difficulty estimate result
 */
export const saveDifficultyEstimate = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    difficultyScore: v.union(
      v.literal("trivial"),
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("complex")
    ),
    difficultyReasoning: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiDifficultyScore: args.difficultyScore,
      aiDifficultyReasoning: args.difficultyReasoning,
      aiDifficultyGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Generate AI difficulty estimate using the agent
 */
export const generateDifficultyEstimate = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    // Get feedback and context (reuse clarification's query)
    const data = await ctx.runQuery(
      internal.feedback.clarification.getFeedbackForClarification,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback) {
      throw new Error("Feedback not found");
    }

    const { feedback, organizationName, repoAnalysis } = data;

    // Build context for difficulty estimation
    const contextParts: string[] = [];

    if (organizationName) {
      contextParts.push(`Organization: ${organizationName}`);
    }

    if (repoAnalysis) {
      contextParts.push(`
Project Context:
- Summary: ${repoAnalysis.summary || "N/A"}
- Tech Stack: ${repoAnalysis.techStack || "N/A"}
- Architecture: ${repoAnalysis.architecture || "N/A"}
`);
    }

    if (feedback.aiClarification) {
      contextParts.push(
        `AI-enhanced understanding:\n${feedback.aiClarification}`
      );
    }

    const contextString =
      contextParts.length > 0 ? `\n\n${contextParts.join("\n\n")}` : "";

    // Generate difficulty estimate using the agent
    const result = await feedbackClarificationAgent.generateText(
      ctx,
      { userId: "system" },
      {
        prompt: `You are an experienced software engineer assessing the implementation difficulty of feature requests and bug reports.

Analyze the following feedback and estimate its implementation difficulty:

Title: ${feedback.title}

Description: ${feedback.description}
${contextString}

Rate the difficulty on this scale:
- "trivial": Quick fix or configuration change (< 1 hour)
- "easy": Straightforward implementation with clear path (1-4 hours)
- "medium": Requires some investigation and moderate code changes (1-2 days)
- "hard": Significant changes across multiple components (3-5 days)
- "complex": Major feature requiring architectural changes or extensive work (1+ weeks)

Respond in this exact JSON format:
{
  "difficulty": "trivial" | "easy" | "medium" | "hard" | "complex",
  "reasoning": "Brief explanation of why this difficulty level was chosen"
}

Only output the JSON, no additional text.`,
      }
    );

    // Parse the response
    let difficultyScore: "trivial" | "easy" | "medium" | "hard" | "complex" =
      "medium";
    let difficultyReasoning = "Unable to determine difficulty";

    try {
      const responseText = result.text || "{}";
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(JSON_EXTRACT_REGEX);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          difficulty?: string;
          reasoning?: string;
        };
        if (
          parsed.difficulty &&
          ["trivial", "easy", "medium", "hard", "complex"].includes(
            parsed.difficulty
          )
        ) {
          difficultyScore = parsed.difficulty as typeof difficultyScore;
        }
        if (parsed.reasoning) {
          difficultyReasoning = parsed.reasoning;
        }
      }
    } catch {
      // Use defaults if parsing fails
    }

    // Save the difficulty estimate
    await ctx.runMutation(
      internal.feedback.clarification_difficulty.saveDifficultyEstimate,
      {
        feedbackId: args.feedbackId,
        difficultyScore,
        difficultyReasoning,
      }
    );

    return { success: true };
  },
});
