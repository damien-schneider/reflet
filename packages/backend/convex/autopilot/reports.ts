/**
 * Reports — internal mutations/queries for the autopilotReports table.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { assignedAgent, priority } from "./schema/validators";

const reportType = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("on_demand")
);

const trend = v.union(v.literal("up"), v.literal("down"), v.literal("stable"));

export const createReport = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    reportType,
    title: v.string(),
    executiveSummary: v.string(),
    healthScore: v.number(),
    sections: v.array(
      v.object({
        heading: v.string(),
        content: v.string(),
        metrics: v.array(
          v.object({
            label: v.string(),
            value: v.string(),
            trend,
          })
        ),
      })
    ),
    recommendations: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        priority,
      })
    ),
    sourceAgent: v.optional(assignedAgent),
    tags: v.optional(v.array(v.string())),
    needsReview: v.optional(v.boolean()),
  },
  returns: v.id("autopilotReports"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotReports", {
      organizationId: args.organizationId,
      reportType: args.reportType,
      title: args.title,
      executiveSummary: args.executiveSummary,
      healthScore: args.healthScore,
      sections: args.sections,
      recommendations: args.recommendations,
      sourceAgent: args.sourceAgent,
      tags: args.tags ?? [],
      needsReview: args.needsReview ?? false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getReportById = internalQuery({
  args: { reportId: v.id("autopilotReports") },
  handler: (ctx, args) => {
    return ctx.db.get(args.reportId);
  },
});

export const acknowledgeReport = internalMutation({
  args: { reportId: v.id("autopilotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      needsReview: false,
      reviewedAt: now,
      acknowledgedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const archiveReport = internalMutation({
  args: { reportId: v.id("autopilotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      archived: true,
      needsReview: false,
      reviewedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
