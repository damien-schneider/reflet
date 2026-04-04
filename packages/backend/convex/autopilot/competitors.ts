/**
 * Competitors — structured competitor tracking for Growth and Sales agents.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const createCompetitor = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    strengths: v.optional(v.string()),
    weaknesses: v.optional(v.string()),
    pricingTier: v.optional(v.string()),
    features: v.optional(v.string()),
  },
  returns: v.id("autopilotCompetitors"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotCompetitors", {
      organizationId: args.organizationId,
      name: args.name,
      url: args.url,
      description: args.description,
      strengths: args.strengths,
      weaknesses: args.weaknesses,
      pricingTier: args.pricingTier,
      features: args.features,
      lastResearchedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCompetitor = internalMutation({
  args: {
    competitorId: v.id("autopilotCompetitors"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    strengths: v.optional(v.string()),
    weaknesses: v.optional(v.string()),
    pricingTier: v.optional(v.string()),
    features: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const competitor = await ctx.db.get(args.competitorId);
    if (!competitor) {
      return null;
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      lastResearchedAt: Date.now(),
    };
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.url !== undefined) {
      updates.url = args.url;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.strengths !== undefined) {
      updates.strengths = args.strengths;
    }
    if (args.weaknesses !== undefined) {
      updates.weaknesses = args.weaknesses;
    }
    if (args.pricingTier !== undefined) {
      updates.pricingTier = args.pricingTier;
    }
    if (args.features !== undefined) {
      updates.features = args.features;
    }

    await ctx.db.patch(args.competitorId, updates);
    return null;
  },
});

export const getCompetitorsByOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotCompetitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const findCompetitorByName = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const competitors = await ctx.db
      .query("autopilotCompetitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const nameLower = args.name.toLowerCase();
    return competitors.find((c) => c.name.toLowerCase() === nameLower) ?? null;
  },
});
