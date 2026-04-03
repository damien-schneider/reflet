/**
 * Support panel queries — conversations, drafted replies, escalations.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const requireOrgMembership = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return membership;
};

export const listSupportConversations = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("triaged"),
        v.literal("drafted"),
        v.literal("replied"),
        v.literal("escalated"),
        v.literal("resolved")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const status = args.status;
      return ctx.db
        .query("autopilotSupportConversations")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotSupportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getSupportStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const conversations = await ctx.db
      .query("autopilotSupportConversations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const feedbackLog = await ctx.db
      .query("autopilotFeedbackLog")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", "support")
      )
      .collect();

    const approved = feedbackLog.filter(
      (f) => f.decision === "approved"
    ).length;
    const total = feedbackLog.length;
    const approvalRate = total === 0 ? 1 : approved / total;

    return {
      totalConversations: conversations.length,
      newCount: conversations.filter((c) => c.status === "new").length,
      draftedCount: conversations.filter((c) => c.status === "drafted").length,
      escalatedCount: conversations.filter((c) => c.status === "escalated")
        .length,
      resolvedCount: conversations.filter((c) => c.status === "resolved")
        .length,
      responseApprovalRate: Math.round(approvalRate * 100),
    };
  },
});
