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
    source: v.optional(
      v.union(v.literal("work"), v.literal("document"), v.literal("report"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    const workItems =
      args.source === "document" || args.source === "report"
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
      args.source === "work" || args.source === "report"
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

    const reports =
      args.source === "work" || args.source === "document"
        ? []
        : await ctx.db
            .query("autopilotReports")
            .withIndex("by_org_review", (q) =>
              q
                .eq("organizationId", args.organizationId)
                .eq("needsReview", true)
            )
            .order("desc")
            .filter((q) => q.eq(q.field("archived"), false))
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
      ...reports.map((report) => ({
        _id: report._id,
        _creationTime: report._creationTime,
        _source: "report" as const,
        organizationId: report.organizationId,
        title: report.title,
        description: report.executiveSummary,
        reviewType: "ceo_report" as const,
        type: report.reportType,
        priority: (() => {
          if (report.healthScore < 40) {
            return "high" as const;
          }
          if (report.healthScore < 70) {
            return "medium" as const;
          }
          return "low" as const;
        })(),
        sourceAgent: report.sourceAgent,
        needsReview: report.needsReview,
        status: report.archived ? "archived" : "pending_review",
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
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

    const reports = await ctx.db
      .query("autopilotReports")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    return {
      workItemCount: workItems.length,
      documentCount: documents.length,
      reportCount: reports.length,
      total: workItems.length + documents.length + reports.length,
    };
  },
});
