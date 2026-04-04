/**
 * Config queries — autopilot configuration and credential status.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const getConfig = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("autopilotConfig"),
      _creationTime: v.number(),
      adapter: v.string(),
      autonomyLevel: v.string(),
      autoMergePRs: v.boolean(),
      ceoChatThreadId: v.optional(v.string()),
      costUsedTodayUsd: v.optional(v.number()),
      createdAt: v.number(),
      dailyCostCapUsd: v.optional(v.number()),
      emailBlocklist: v.optional(v.array(v.string())),
      emailDailyLimit: v.optional(v.number()),
      enabled: v.boolean(),
      intelligenceEnabled: v.optional(v.boolean()),
      pmEnabled: v.optional(v.boolean()),
      ctoEnabled: v.optional(v.boolean()),
      devEnabled: v.optional(v.boolean()),
      securityEnabled: v.optional(v.boolean()),
      architectEnabled: v.optional(v.boolean()),
      growthEnabled: v.optional(v.boolean()),
      supportEnabled: v.optional(v.boolean()),
      docsEnabled: v.optional(v.boolean()),
      salesEnabled: v.optional(v.boolean()),
      autonomyMode: v.optional(v.string()),
      stoppedAt: v.optional(v.number()),
      fullAutoDelay: v.optional(v.number()),
      autoMergeThreshold: v.optional(v.number()),
      maxPendingTasksPerAgent: v.optional(v.number()),
      maxPendingTasksTotal: v.optional(v.number()),
      maxTasksPerDay: v.number(),
      organizationId: v.id("organizations"),
      orgEmailAddress: v.optional(v.string()),
      requireArchitectReview: v.boolean(),
      tasksResetAt: v.number(),
      tasksUsedToday: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

export const getCredentialStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const credentials = await ctx.db
      .query("autopilotAdapterCredentials")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return credentials.map((c) => ({
      adapter: c.adapter,
      isValid: c.isValid,
      lastValidatedAt: c.lastValidatedAt,
    }));
  },
});
