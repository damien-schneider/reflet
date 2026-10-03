import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { statusFieldsFor } from "../feedback/status_target";
import { requireAuthUser } from "../shared/access";
import { insightStatus, insightType } from "./tableFields";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: v.optional(insightStatus),
    type: v.optional(insightType),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const get = query({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const getSignalsForInsight = query({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const dismiss = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const markReviewed = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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

export const convertToFeedback = mutation({
  args: {
    insightId: v.id("intelligenceInsights"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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
      commentCount: 0,
      createdAt: now,
      description: insight.suggestedFeedbackDescription ?? "",
      isApproved: true,
      isPinned: false,
      organizationId: insight.organizationId,
      source: "api",
      ...(await statusFieldsFor(ctx, {
        organizationId: insight.organizationId,
        status: "open",
      })),
      title: insight.suggestedFeedbackTitle,
      updatedAt: now,
      voteCount: 0,
    });

    const existingLinkedIds = insight.linkedFeedbackIds ?? [];
    await ctx.db.patch(args.insightId, {
      linkedFeedbackIds: [...existingLinkedIds, feedbackId],
      status: "converted_to_feedback",
    });

    return feedbackId;
  },
});
