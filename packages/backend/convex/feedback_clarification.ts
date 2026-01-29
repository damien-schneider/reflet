import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { feedbackClarificationAgent } from "./agent";
import { getAuthUser } from "./utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get clarification status for a feedback item
 */
export const getClarificationStatus = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    return {
      aiClarification: feedback.aiClarification,
      aiClarificationGeneratedAt: feedback.aiClarificationGeneratedAt,
      hasAiClarification: Boolean(feedback.aiClarification),
    };
  },
});

/**
 * Internal query to get feedback and context for clarification
 */
export const getFeedbackForClarification = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Get organization context
    const org = await ctx.db.get(feedback.organizationId);

    // Get repo analysis if available
    const repoAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .order("desc")
      .first();

    // Get website references
    const websiteRefs = await ctx.db
      .query("websiteReferences")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "success"))
      .collect();

    return {
      feedback,
      organizationName: org?.name,
      repoAnalysis: repoAnalysis?.status === "completed" ? repoAnalysis : null,
      websiteRefs,
    };
  },
});

/**
 * Generate a coding prompt for AI assistants (Claude Code, Copilot, Cursor, etc.)
 */
export const generateCodingPrompt = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return null;
    }

    // Get repo analysis for context
    const repoAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    // Get GitHub connection for repo name
    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .first();

    // Build the prompt
    const promptParts: string[] = [];

    // Header
    const feedbackType = feedback.title.toLowerCase().includes("bug")
      ? "Fix"
      : "Implement";
    promptParts.push(`## ${feedbackType}: ${feedback.title}\n`);

    // Description
    if (feedback.description) {
      promptParts.push(`### User Request\n${feedback.description}\n`);
    }

    // AI Clarification (if available)
    if (feedback.aiClarification) {
      promptParts.push(
        `### Clarified Requirements\n${feedback.aiClarification}\n`
      );
    }

    // Codebase context
    if (repoAnalysis || githubConnection?.repositoryFullName) {
      promptParts.push("### Codebase Context");

      if (githubConnection?.repositoryFullName) {
        promptParts.push(
          `**Repository:** ${githubConnection.repositoryFullName}`
        );
      }

      if (repoAnalysis?.summary) {
        promptParts.push(`**Project:** ${repoAnalysis.summary}`);
      }

      if (repoAnalysis?.techStack) {
        promptParts.push(`**Tech Stack:** ${repoAnalysis.techStack}`);
      }

      if (repoAnalysis?.architecture) {
        promptParts.push(`**Architecture:** ${repoAnalysis.architecture}`);
      }

      promptParts.push("");
    }

    // Instructions
    promptParts.push(`### Instructions
1. Analyze the codebase to understand the current implementation
2. Identify the relevant files that need to be modified
3. Implement the changes following the existing code patterns and conventions
4. Ensure the solution is well-tested and follows best practices
5. Keep changes minimal and focused on the specific request`);

    return {
      prompt: promptParts.join("\n"),
      feedbackTitle: feedback.title,
      hasRepoContext: Boolean(repoAnalysis),
    };
  },
});

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
 * Initiate AI clarification for a feedback item (admin only)
 */
export const initiateClarification = mutation({
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
      throw new Error("Only admins can generate AI clarifications");
    }

    // Schedule the action to generate clarification
    await ctx.scheduler.runAfter(
      0,
      internal.feedback_clarification.generateClarification,
      {
        feedbackId: args.feedbackId,
      }
    );

    return { started: true };
  },
});

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
      internal.feedback_clarification.generateDraftReplyAction,
      {
        feedbackId: args.feedbackId,
      }
    );

    return { started: true };
  },
});

/**
 * Internal mutation to save clarification result
 */
export const saveClarification = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    clarification: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiClarification: args.clarification,
      aiClarificationGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
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
 * Generate AI clarification using the agent
 */
export const generateClarification = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    // Get feedback and context
    const data = await ctx.runQuery(
      internal.feedback_clarification.getFeedbackForClarification,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback) {
      throw new Error("Feedback not found");
    }

    const { feedback, organizationName, repoAnalysis, websiteRefs } = data;

    // Build context prompt
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

    if (websiteRefs.length > 0) {
      const websiteContext = websiteRefs
        .map((ref) => {
          let text = `- ${ref.url}`;
          if (ref.title) {
            text += `: ${ref.title}`;
          }
          if (ref.description) {
            text += ` - ${ref.description}`;
          }
          return text;
        })
        .join("\n");
      contextParts.push(`Related Websites:\n${websiteContext}`);
    }

    const contextString =
      contextParts.length > 0
        ? `\n\nContext about the product:\n${contextParts.join("\n\n")}`
        : "";

    // Generate clarification using the agent
    const result = await feedbackClarificationAgent.generateText(
      ctx,
      { userId: "system" },
      {
        prompt: `Please clarify and enhance the following user feedback for a software product:

Title: ${feedback.title}

Description: ${feedback.description}
${contextString}

Provide a clear, detailed clarification that:
1. Restates the core issue or request
2. Expands on the user's needs and pain points
3. Suggests how this might be addressed
4. Maintains the user's original intent

Format your response as a well-structured clarification, ready to be shown to the development team.`,
      }
    );

    const clarification = result.text || "Unable to generate clarification";

    // Save the clarification
    await ctx.runMutation(internal.feedback_clarification.saveClarification, {
      feedbackId: args.feedbackId,
      clarification:
        typeof clarification === "string"
          ? clarification
          : JSON.stringify(clarification),
    });

    return { success: true };
  },
});

/**
 * Generate AI draft reply using the agent
 */
export const generateDraftReplyAction = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    // Get feedback and context
    const data = await ctx.runQuery(
      internal.feedback_clarification.getFeedbackForDraftReply,
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
    await ctx.runMutation(internal.feedback_clarification.saveDraftReply, {
      feedbackId: args.feedbackId,
      draftReply:
        typeof draftReply === "string"
          ? draftReply
          : JSON.stringify(draftReply),
    });

    return { success: true };
  },
});
