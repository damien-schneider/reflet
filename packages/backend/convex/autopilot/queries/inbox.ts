/**
 * Inbox queries — unified view of work items + documents needing review.
 */

import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { reportType } from "../schema/reports.tables";
import { validatorScoreObject } from "../schema/use_cases.tables";
import {
  assignedAgent,
  documentStatus,
  documentType,
  impactLevel,
  priority,
  workItemStatus,
  workItemType,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

type ReviewState = "pending" | "resolved";

interface ReviewQueryOptions {
  limit: number;
  organizationId: Id<"organizations">;
  reviewState: ReviewState;
}

const reviewStateValidator = v.union(
  v.literal("pending"),
  v.literal("resolved")
);

const workInboxItemValidator = v.object({
  _id: v.id("autopilotWorkItems"),
  _creationTime: v.number(),
  _source: v.literal("work"),
  organizationId: v.id("organizations"),
  type: workItemType,
  parentId: v.optional(v.id("autopilotWorkItems")),
  title: v.string(),
  description: v.string(),
  status: workItemStatus,
  priority,
  assignedAgent: v.optional(assignedAgent),
  needsReview: v.boolean(),
  reviewType: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  prUrl: v.optional(v.string()),
  prNumber: v.optional(v.number()),
  branch: v.optional(v.string()),
  completionPercent: v.optional(v.number()),
  acceptanceCriteria: v.optional(v.array(v.string())),
  isPublicRoadmap: v.optional(v.boolean()),
  includeInChangelog: v.optional(v.boolean()),
  createdByUser: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const documentInboxItemValidator = v.object({
  _id: v.id("autopilotDocuments"),
  _creationTime: v.number(),
  _source: v.literal("document"),
  organizationId: v.id("organizations"),
  type: documentType,
  title: v.string(),
  content: v.string(),
  tags: v.array(v.string()),
  sourceAgent: v.optional(assignedAgent),
  status: documentStatus,
  dependsOnDocIds: v.optional(v.array(v.id("autopilotDocuments"))),
  validation: v.optional(validatorScoreObject),
  needsReview: v.boolean(),
  reviewType: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  linkedWorkItemId: v.optional(v.id("autopilotWorkItems")),
  linkedCompetitorId: v.optional(v.id("autopilotCompetitors")),
  linkedLeadId: v.optional(v.id("autopilotLeads")),
  relevanceScore: v.optional(v.number()),
  impactLevel: v.optional(impactLevel),
  sourceUrls: v.optional(v.array(v.string())),
  keyFindings: v.optional(v.array(v.string())),
  platform: v.optional(v.string()),
  targetUrl: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  publishedUrl: v.optional(v.string()),
  metadata: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const reportInboxItemValidator = v.object({
  _id: v.id("autopilotReports"),
  _creationTime: v.number(),
  _source: v.literal("report"),
  organizationId: v.id("organizations"),
  title: v.string(),
  description: v.string(),
  reviewType: v.literal("ceo_report"),
  type: reportType,
  priority,
  sourceAgent: v.optional(assignedAgent),
  needsReview: v.boolean(),
  status: v.union(v.literal("pending_review"), v.literal("acknowledged")),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const inboxItemValidator = v.union(
  workInboxItemValidator,
  documentInboxItemValidator,
  reportInboxItemValidator
);

const listWorkItems = async (
  ctx: { db: QueryCtx["db"] },
  options: ReviewQueryOptions
) => {
  const needsReview = options.reviewState === "pending";
  const queryResult = ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_review", (q) =>
      q
        .eq("organizationId", options.organizationId)
        .eq("needsReview", needsReview)
    )
    .order("desc");

  if (options.reviewState === "pending") {
    return await queryResult.take(options.limit);
  }

  return await queryResult
    .filter((q) => q.neq(q.field("reviewedAt"), undefined))
    .take(options.limit);
};

const listDocuments = async (
  ctx: { db: QueryCtx["db"] },
  options: ReviewQueryOptions
) => {
  const needsReview = options.reviewState === "pending";
  const queryResult = ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_review", (q) =>
      q
        .eq("organizationId", options.organizationId)
        .eq("needsReview", needsReview)
    )
    .order("desc");

  if (options.reviewState === "pending") {
    return await queryResult.take(options.limit);
  }

  return await queryResult
    .filter((q) => q.neq(q.field("reviewedAt"), undefined))
    .take(options.limit);
};

const listReports = async (
  ctx: { db: QueryCtx["db"] },
  options: ReviewQueryOptions
) => {
  const needsReview = options.reviewState === "pending";
  const queryResult = ctx.db
    .query("autopilotReports")
    .withIndex("by_org_review", (q) =>
      q
        .eq("organizationId", options.organizationId)
        .eq("needsReview", needsReview)
    )
    .order("desc")
    .filter((q) => q.eq(q.field("archived"), false));

  if (options.reviewState === "pending") {
    return await queryResult.take(options.limit);
  }

  return await queryResult
    .filter((q) => q.neq(q.field("reviewedAt"), undefined))
    .take(options.limit);
};

export const listInboxItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    reviewState: v.optional(reviewStateValidator),
    source: v.optional(
      v.union(v.literal("work"), v.literal("document"), v.literal("report"))
    ),
  },
  returns: v.array(inboxItemValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;
    const reviewState = args.reviewState ?? "pending";
    const queryOptions = {
      organizationId: args.organizationId,
      limit,
      reviewState,
    };

    const workItems =
      args.source === "document" || args.source === "report"
        ? []
        : await listWorkItems(ctx, queryOptions);

    const documents =
      args.source === "work" || args.source === "report"
        ? []
        : await listDocuments(ctx, queryOptions);

    const reports =
      args.source === "work" || args.source === "document"
        ? []
        : await listReports(ctx, queryOptions);

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
        status: report.needsReview
          ? ("pending_review" as const)
          : ("acknowledged" as const),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);

    return unified.slice(0, limit);
  },
});

const inboxCountsValidator = v.object({
  workItemCount: v.number(),
  documentCount: v.number(),
  reportCount: v.number(),
  total: v.number(),
});

export const getInboxCounts = query({
  args: { organizationId: v.id("organizations") },
  returns: inboxCountsValidator,
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
