import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { feedbackClarificationAgent } from "../ai/agent";
import { getAuthUser } from "../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get draft reply status for a feedback item
 */
export const getDraftReplyStatus = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    return {
      aiDraftReply: feedback.aiDraftReply,
      aiDraftReplyGeneratedAt: feedback.aiDraftReplyGeneratedAt,
      hasAiDraftReply: Boolean(feedback.aiDraftReply),
    };
  },
});

/**
 * Internal query to get feedback context for draft reply
 */
export const getFeedbackForDraftReply = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Get organization context
    const org = await ctx.db.get(feedback.organizationId);

    return {
      feedback,
      organizationName: org?.name,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Initiate AI draft reply generation for a feedback item (admin only)
 */
export const initiateDraftReply = mutation({
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
      throw new Error("Only admins can generate AI draft replies");
    }

    // Schedule the action to generate draft reply
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.clarification_draft_reply.generateDraftReplyAction,
      {
        feedbackId: args.feedbackId,
      }
    );

    return { started: true };
  },
});

/**
 * Internal mutation to save draft reply result
 */
export const saveDraftReply = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    draftReply: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiDraftReply: args.draftReply,
      aiDraftReplyGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clear draft reply after user posts a comment
 */
export const clearDraftReply = mutation({
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
      throw new Error("Only admins can clear draft replies");
    }

    await ctx.db.patch(args.feedbackId, {
      aiDraftReply: undefined,
      aiDraftReplyGeneratedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Generate AI draft reply using the agent
 */
export const generateDraftReplyAction = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    // Get feedback and context
    const data = await ctx.runQuery(
      internal.feedback.clarification_draft_reply.getFeedbackForDraftReply,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback) {
      throw new Error("Feedback not found");
    }

    const { feedback, organizationName } = data;

    // Build context for the reply
    const contextParts: string[] = [];

    if (organizationName) {
      contextParts.push(`You are responding on behalf of ${organizationName}.`);
    }

    if (feedback.aiClarification) {
      contextParts.push(
        `AI-enhanced understanding of the feedback:\n${feedback.aiClarification}`
      );
    }

    const contextString =
      contextParts.length > 0 ? `\n\n${contextParts.join("\n\n")}` : "";

    // Generate draft reply using the agent
    const result = await feedbackClarificationAgent.generateText(
      ctx,
      { userId: "system" },
      {
        prompt: `You are a helpful product team member responding to user feedback. Write a professional, friendly, and helpful reply to the following feedback:

Title: ${feedback.title}

User's feedback: ${feedback.description}
${contextString}

Write a reply that:
1. Thanks the user for their feedback
2. Acknowledges their concern or request
3. Provides a helpful response (status update, clarification, or next steps)
4. Maintains a professional yet warm tone
5. Is concise but thorough

Write only the reply text, no additional commentary.`,
      }
    );

    const draftReply = result.text || "Unable to generate draft reply";

    // Save the draft reply
    await ctx.runMutation(
      internal.feedback.clarification_draft_reply.saveDraftReply,
      {
        feedbackId: args.feedbackId,
        draftReply:
          typeof draftReply === "string"
            ? draftReply
            : JSON.stringify(draftReply),
      }
    );

    return { success: true };
  },
});
