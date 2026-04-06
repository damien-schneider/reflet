/**
 * Competitors — structured competitor tracking for Growth and Sales agents.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const moveValidator = v.object({
  action: v.string(),
  impact: v.string(),
  sourceUrl: v.optional(v.string()),
  competitivityScore: v.number(),
  recordedAt: v.number(),
});

const featureGapValidator = v.object({
  feature: v.string(),
  us: v.string(),
  them: v.string(),
  gap: v.string(),
});

const MAX_MOVES = 20;

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
    competitivityScore: v.optional(v.number()),
    moves: v.optional(v.array(moveValidator)),
    featureGaps: v.optional(v.array(featureGapValidator)),
    strengthsList: v.optional(v.array(v.string())),
    weaknessesList: v.optional(v.array(v.string())),
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
      competitivityScore: args.competitivityScore,
      moves: args.moves,
      featureGaps: args.featureGaps,
      strengthsList: args.strengthsList,
      weaknessesList: args.weaknessesList,
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
    // New structured intelligence fields
    competitivityScore: v.optional(v.number()),
    moveToAppend: v.optional(moveValidator),
    featureGaps: v.optional(v.array(featureGapValidator)),
    strengthsList: v.optional(v.array(v.string())),
    weaknessesList: v.optional(v.array(v.string())),
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
    if (args.competitivityScore !== undefined) {
      updates.competitivityScore = Math.max(
        competitor.competitivityScore ?? 0,
        args.competitivityScore
      );
    }
    if (args.moveToAppend !== undefined) {
      const existing = competitor.moves ?? [];
      const merged = [...existing, args.moveToAppend];
      merged.sort((a, b) => b.recordedAt - a.recordedAt);
      updates.moves = merged.slice(0, MAX_MOVES);
    }
    if (args.featureGaps !== undefined) {
      updates.featureGaps = args.featureGaps;
    }
    if (args.strengthsList !== undefined) {
      updates.strengthsList = args.strengthsList;
    }
    if (args.weaknessesList !== undefined) {
      updates.weaknessesList = args.weaknessesList;
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
