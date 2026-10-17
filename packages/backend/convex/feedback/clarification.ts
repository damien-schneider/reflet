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
import { requireAuthUser, requireOrgMember } from "../shared/access";

export const getClarificationStatus = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    await requireOrgMember(ctx, feedback.organizationId);

    return {
      aiClarification: feedback.aiClarification,
      aiClarificationGeneratedAt: feedback.aiClarificationGeneratedAt,
      hasAiClarification: Boolean(feedback.aiClarification),
    };
  },
});

export const getFeedbackForClarification = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);

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
      websiteRefs,
    };
  },
});

export const initiateClarification = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can generate AI clarifications");
    }

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

export const saveClarification = internalMutation({
  args: {
    clarification: v.string(),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiClarification: args.clarification,
      aiClarificationGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const generateClarification = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.feedback.clarification.getFeedbackForClarification,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback) {
      throw new Error("Feedback not found");
    }

    const { feedback, organizationName, websiteRefs } = data;

    const contextParts: string[] = [];

    if (organizationName) {
      contextParts.push(`Organization: ${organizationName}`);
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

    await ctx.runMutation(internal.feedback.clarification.saveClarification, {
      clarification:
        typeof clarification === "string"
          ? clarification
          : JSON.stringify(clarification),
      feedbackId: args.feedbackId,
    });

    return { success: true };
  },
});

export const generateCodingPrompt = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    await requireOrgMember(ctx, feedback.organizationId);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return null;
    }

    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .first();

    const promptParts: string[] = [];

    const feedbackType = feedback.title.toLowerCase().includes("bug")
      ? "Fix"
      : "Implement";
    promptParts.push(`## ${feedbackType}: ${feedback.title}\n`);

    if (feedback.description) {
      promptParts.push(`### User Request\n${feedback.description}\n`);
    }

    if (feedback.aiClarification) {
      promptParts.push(
        `### Clarified Requirements\n${feedback.aiClarification}\n`
      );
    }

    if (githubConnection?.repositoryFullName) {
      promptParts.push("### Codebase Context");

      promptParts.push(
        `**Repository:** ${githubConnection.repositoryFullName}`
      );

      promptParts.push("");
    }

    promptParts.push(`### Instructions
1. Analyze the codebase to understand the current implementation
2. Identify the relevant files that need to be modified
3. Implement the changes following the existing code patterns and conventions
4. Ensure the solution is well-tested and follows best practices
5. Keep changes minimal and focused on the specific request`);

    return {
      feedbackTitle: feedback.title,
      prompt: promptParts.join("\n"),
    };
  },
});
