/**
 * Inbox queries — unified view of work items + documents needing review.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listInboxItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    source: v.optional(v.union(v.literal("work"), v.literal("document"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    const workItems =
      args.source === "document"
        ? []
        : await ctx.db
            .query("autopilotWorkItems")
            .withIndex("by_org_review", (q) =>
              q
                .eq("organizationId", args.organizationId)
                .eq("needsReview", true)
            )
            .order("desc")
            .take(limit);

    const documents =
      args.source === "work"
        ? []
        : await ctx.db
            .query("autopilotDocuments")
            .withIndex("by_org_review", (q) =>
              q
                .eq("organizationId", args.organizationId)
                .eq("needsReview", true)
            )
            .order("desc")
            .take(limit);

    const unified = [
      ...workItems.map((item) => ({
        ...item,
        _source: "work" as const,
      })),
      ...documents.map((doc) => ({
        ...doc,
        _source: "document" as const,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);

    return unified.slice(0, limit);
  },
});

export const getInboxCounts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const workItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    const documents = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();

    return {
      workItemCount: workItems.length,
      documentCount: documents.length,
      total: workItems.length + documents.length,
    };
  },
});
