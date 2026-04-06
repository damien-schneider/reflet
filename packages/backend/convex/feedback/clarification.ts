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
      internal.feedback.clarification.generateClarification,
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
      internal.feedback.clarification.getFeedbackForClarification,
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
        .map((ref: { url: string; title?: string; description?: string }) => {
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
    await ctx.runMutation(internal.feedback.clarification.saveClarification, {
      feedbackId: args.feedbackId,
      clarification:
        typeof clarification === "string"
          ? clarification
          : JSON.stringify(clarification),
    });

    return { success: true };
  },
});
