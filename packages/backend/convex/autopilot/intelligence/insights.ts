import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { insightStatus, insightType } from "./tableFields";

// ============================================
// QUERIES
// ============================================

/**
 * List insights for an organization with optional filters
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(insightStatus),
    type: v.optional(insightType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const limit = args.limit ?? 50;

    let insights = await ctx.db
      .query("intelligenceInsights")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    if (args.status) {
      insights = insights.filter((i) => i.status === args.status);
    }

    if (args.type) {
      insights = insights.filter((i) => i.type === args.type);
    }

    return insights.slice(0, limit);
  },
});

/**
 * Get a single insight by ID
 */
export const get = query({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", insight.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    return insight;
  },
});

/**
 * Get signals linked to an insight
 */
export const getSignalsForInsight = query({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", insight.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const signals = await Promise.all(
      insight.signalIds.map((signalId) => ctx.db.get(signalId))
    );

    return signals.filter(Boolean);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Dismiss an insight (admin only)
 */
export const dismiss = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", insight.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can dismiss insights");
    }

    await ctx.db.patch(args.insightId, { status: "dismissed" });
  },
});

/**
 * Mark an insight as reviewed (admin only)
 */
export const markReviewed = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", insight.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can mark insights as reviewed");
    }

    await ctx.db.patch(args.insightId, { status: "reviewed" });
  },
});

/**
 * Convert an insight to a feedback item (admin only)
 */
export const convertToFeedback = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", insight.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can convert insights to feedback");
    }

    if (!insight.suggestedFeedbackTitle) {
      throw new Error("Insight has no suggested feedback title");
    }

    const now = Date.now();

    const feedbackId = await ctx.db.insert("feedback", {
      organizationId: insight.organizationId,
      title: insight.suggestedFeedbackTitle,
      description: insight.suggestedFeedbackDescription ?? "",
      status: "open",
      voteCount: 0,
      commentCount: 0,
      isApproved: true,
      isPinned: false,
      source: "api",
      createdAt: now,
      updatedAt: now,
    });

    const existingLinkedIds = insight.linkedFeedbackIds ?? [];
    await ctx.db.patch(args.insightId, {
      status: "converted_to_feedback",
      linkedFeedbackIds: [...existingLinkedIds, feedbackId],
    });

    return feedbackId;
  },
});
