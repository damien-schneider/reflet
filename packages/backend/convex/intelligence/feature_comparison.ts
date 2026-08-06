import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { generateStructured } from "./structured_output";
import { SEVEN_DAYS_MS, SYNTHESIS_MODEL } from "./synthesis_shared";

export const upsertFeatureComparison = internalMutation({
  args: {
    features: v.array(
      v.object({
        competitors: v.array(
          v.object({
            competitorId: v.id("competitors"),
            details: v.optional(v.string()),
            hasIt: v.boolean(),
          })
        ),
        featureName: v.string(),
        userProductHasIt: v.boolean(),
      })
    ),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("featureComparisons")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        aiGeneratedAt: now,
        features: args.features,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    const comparisonId = await ctx.db.insert("featureComparisons", {
      aiGeneratedAt: now,
      features: args.features,
      lastUpdatedAt: now,
      organizationId: args.organizationId,
    });

    return comparisonId;
  },
});

export const updateFeatureComparison = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - SEVEN_DAYS_MS;

    interface Signal {
      competitorId?: Id<"competitors">;
      content: string;
      signalType: string;
      title: string;
    }

    const signals: Signal[] = await ctx.runQuery(
      internal.intelligence.synthesis.getRecentSignals,
      { organizationId: args.organizationId, since }
    );

    const featureSignals: Signal[] = signals.filter(
      (s: Signal) =>
        s.signalType === "feature_gap" || s.signalType === "competitor_update"
    );

    if (featureSignals.length === 0) {
      return;
    }

    const signalsSummary: string =
      featureSignals.length > 0
        ? featureSignals
            .map(
              (s: Signal) =>
                `(${s.signalType}, competitor: ${s.competitorId ?? "N/A"}) "${s.title}": ${s.content.slice(0, 300)}`
            )
            .join("\n\n")
        : "No recent feature-related signals.";

    const featureComparisonSchema = z.object({
      features: z.array(
        z.object({
          competitors: z.array(
            z.object({
              competitorId: z.string().describe("The competitor ID"),
              details: z.string().optional(),
              hasIt: z.boolean(),
            })
          ),
          featureName: z.string(),
          userProductHasIt: z.boolean(),
        })
      ),
    });

    const systemPrompt =
      'You are a product analyst. Build a feature comparison matrix from feature-related signals.\n\nRespond with ONLY valid JSON matching this exact format:\n{\n  "features": [\n    {\n      "featureName": "string",\n      "userProductHasIt": true,\n      "competitors": [{ "competitorId": "string", "hasIt": true, "details": "string (optional)" }]\n    }\n  ]\n}';

    const userPrompt: string = `FEATURE SIGNALS:
${signalsSummary}

Generate a feature comparison matrix. Use the exact competitor IDs from the signals above.`;

    try {
      const result = await generateStructured({
        model: SYNTHESIS_MODEL,
        prompt: userPrompt,
        schema: featureComparisonSchema,
        system: systemPrompt,
      });

      // Build a map of valid competitor IDs from signals for validation
      const validCompetitorIds = new Map<string, Id<"competitors">>();
      for (const s of featureSignals) {
        if (s.competitorId) {
          validCompetitorIds.set(s.competitorId, s.competitorId);
        }
      }

      const features = result.features.map((f) => ({
        competitors: f.competitors
          .filter((c) => validCompetitorIds.has(c.competitorId))
          .map((c) => {
            const typedId = validCompetitorIds.get(c.competitorId);
            if (!typedId) {
              throw new Error(`Invalid competitor ID: ${c.competitorId}`);
            }
            return {
              competitorId: typedId,
              details: c.details,
              hasIt: c.hasIt,
            };
          }),
        featureName: f.featureName,
        userProductHasIt: f.userProductHasIt,
      }));

      await ctx.runMutation(
        internal.intelligence.feature_comparison.upsertFeatureComparison,
        {
          features,
          organizationId: args.organizationId,
        }
      );

      return { featureCount: features.length, success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI parsing failed";
      throw new Error(`Feature comparison failed: ${message}`);
    }
  },
});
