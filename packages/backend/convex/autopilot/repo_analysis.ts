/**
 * Repo analysis CRUD — stores and retrieves autopilot repo analysis records.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const createRepoAnalysis = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  returns: v.id("autopilotRepoAnalysis"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("autopilotRepoAnalysis", {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
      createdAt: Date.now(),
    });
  },
});

export const updateRepoAnalysis = internalMutation({
  args: {
    analysisId: v.id("autopilotRepoAnalysis"),
    techStack: v.optional(v.string()),
    framework: v.optional(v.string()),
    hasCI: v.optional(v.boolean()),
    hasTests: v.optional(v.boolean()),
    hasDocs: v.optional(v.boolean()),
    hasLandingPage: v.optional(v.boolean()),
    hasAnalytics: v.optional(v.boolean()),
    hasMonitoring: v.optional(v.boolean()),
    projectStructure: v.optional(v.string()),
    maturityLevel: v.optional(
      v.union(
        v.literal("new"),
        v.literal("early"),
        v.literal("established"),
        v.literal("mature")
      )
    ),
    findings: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { analysisId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    await ctx.db.patch(analysisId, filtered);
    return null;
  },
});

export const getRepoAnalysis = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotRepoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
  },
});
