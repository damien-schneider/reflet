import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { generateStructured } from "./structured_output";

const SYNTHESIS_MODEL = "anthropic/claude-sonnet-4";

// ============================================
// AI SCHEMAS
// ============================================

const synthesisSchema = z.object({
  insights: z.array(
    z.object({
      priority: z.enum(["critical", "high", "medium", "low"]),
      reasoning: z.string(),
      relatedSignalIndices: z
        .array(z.number())
        .describe("Indices into the signals array"),
      suggestedFeedbackDescription: z.string().optional(),
      suggestedFeedbackTitle: z.string().optional(),
      summary: z.string(),
      title: z.string(),
      type: z.enum([
        "feature_suggestion",
        "competitive_alert",
        "market_opportunity",
        "risk_warning",
      ]),
    })
  ),
});

const battlecardSchema = z.object({
  objectionHandling: z.array(
    z.object({ objection: z.string(), rebuttal: z.string() })
  ),
  overview: z.string(),
  strengths: z.array(z.string()),
  talkTracks: z.array(z.object({ response: z.string(), scenario: z.string() })),
  weaknesses: z.array(z.string()),
});

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get signals since a given timestamp for an org
 */
export const getRecentSignals = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("intelligenceSignals")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", args.since)
      )
      .collect();

    return signals;
  },
});

/**
 * Get existing feedback items for an org (title + description, limited to 100)
 */
export const getExistingFeedback = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(100);

    return feedbackItems.map((f) => ({
      _id: f._id,
      description: f.description,
      title: f.title,
    }));
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Store an insight in the intelligenceInsights table
 */
export const createInsight = internalMutation({
  args: {
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
    organizationId: v.id("organizations"),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    reasoning: v.optional(v.string()),
    signalIds: v.array(v.id("intelligenceSignals")),
    suggestedFeedbackDescription: v.optional(v.string()),
    suggestedFeedbackTitle: v.optional(v.string()),
    summary: v.string(),
    title: v.string(),
    type: v.union(
      v.literal("feature_suggestion"),
      v.literal("competitive_alert"),
      v.literal("market_opportunity"),
      v.literal("risk_warning"),
      v.literal("battlecard")
    ),
  },
  handler: async (ctx, args) => {
    const insightId = await ctx.db.insert("intelligenceInsights", {
      createdAt: Date.now(),
      linkedFeedbackIds: args.linkedFeedbackIds,
      organizationId: args.organizationId,
      priority: args.priority,
      reasoning: args.reasoning,
      signalIds: args.signalIds,
      status: "new",
      suggestedFeedbackDescription: args.suggestedFeedbackDescription,
      suggestedFeedbackTitle: args.suggestedFeedbackTitle,
      summary: args.summary,
      title: args.title,
      type: args.type,
    });

    return insightId;
  },
});

/**
 * Create or update a battlecard for a competitor
 */
export const upsertBattlecard = internalMutation({
  args: {
    competitorId: v.id("competitors"),
    content: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("battlecards")
      .withIndex("by_org_competitor", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("competitorId", args.competitorId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        aiGeneratedAt: now,
        content: args.content,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    const battlecardId = await ctx.db.insert("battlecards", {
      aiGeneratedAt: now,
      competitorId: args.competitorId,
      content: args.content,
      lastUpdatedAt: now,
      organizationId: args.organizationId,
    });

    return battlecardId;
  },
});

/**
 * Create or update feature comparison for an org
 */
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

// ============================================
// INTERNAL ACTIONS
// ============================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolve signal indices to IDs
 */
const resolveSignalIds = (
  indices: number[],
  signals: { _id: Id<"intelligenceSignals"> }[]
): Id<"intelligenceSignals">[] => {
  const ids: Id<"intelligenceSignals">[] = [];
  for (const idx of indices) {
    const signal = idx >= 0 && idx < signals.length ? signals[idx] : undefined;
    if (signal) {
      ids.push(signal._id);
    }
  }
  return ids;
};

/**
 * Match insight title against existing feedback titles
 */
const matchFeedbackByTitle = (
  suggestedTitle: string | undefined,
  existingFeedback: { _id: Id<"feedback">; title: string }[]
): Id<"feedback">[] => {
  if (!suggestedTitle) {
    return [];
  }
  const lowerTitle = suggestedTitle.toLowerCase();
  const matched: Id<"feedback">[] = [];
  for (const fb of existingFeedback) {
    const fbLower = fb.title.toLowerCase();
    if (fbLower.includes(lowerTitle) || lowerTitle.includes(fbLower)) {
      matched.push(fb._id);
    }
  }
  return matched;
};

/**
 * Store generated insights in the database
 */
const storeInsights = async (
  ctx: ActionCtx,
  insights: z.infer<typeof synthesisSchema>["insights"],
  signals: { _id: Id<"intelligenceSignals"> }[],
  existingFeedback: {
    _id: Id<"feedback">;
    title: string;
    description: string;
  }[],
  organizationId: Id<"organizations">
): Promise<number> => {
  let count = 0;
  for (const insight of insights) {
    const relatedSignalIds = resolveSignalIds(
      insight.relatedSignalIndices,
      signals
    );
    const matchedFeedbackIds = matchFeedbackByTitle(
      insight.suggestedFeedbackTitle,
      existingFeedback
    );

    await ctx.runMutation(internal.intelligence.synthesis.createInsight, {
      linkedFeedbackIds:
        matchedFeedbackIds.length > 0 ? matchedFeedbackIds : undefined,
      organizationId,
      priority: insight.priority,
      reasoning: insight.reasoning,
      signalIds: relatedSignalIds,
      suggestedFeedbackDescription: insight.suggestedFeedbackDescription,
      suggestedFeedbackTitle: insight.suggestedFeedbackTitle,
      summary: insight.summary,
      title: insight.title,
      type: insight.type,
    });
    count++;
  }
  return count;
};

/**
 * Main synthesis entry point — generates insights from recent signals
 */
export const runSynthesis = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - SEVEN_DAYS_MS;

    const signals = await ctx.runQuery(
      internal.intelligence.synthesis.getRecentSignals,
      { organizationId: args.organizationId, since }
    );

    console.log(
      `[intelligence] Synthesis: found ${signals.length} signals from last 7 days`
    );

    if (signals.length === 0) {
      console.log("[intelligence] Synthesis: no signals to process, skipping");
      return { insightsCreated: 0 };
    }

    const existingFeedback = await ctx.runQuery(
      internal.intelligence.synthesis.getExistingFeedback,
      { organizationId: args.organizationId }
    );

    const signalsSummary = signals
      .map(
        (
          s: {
            signalType: string;
            source: string;
            title: string;
            content: string;
          },
          i: number
        ) =>
          `[${i}] (${s.signalType}, ${s.source}) "${s.title}": ${s.content.slice(0, 500)}`
      )
      .join("\n\n");

    const feedbackSummary =
      existingFeedback.length > 0
        ? existingFeedback
            .map(
              (f: { title: string; description: string }) =>
                `- "${f.title}": ${f.description.slice(0, 200)}`
            )
            .join("\n")
        : "No existing feedback items.";

    const systemPrompt = `You are a product intelligence analyst. Analyze signals and generate actionable insights.

Rules:
- Look for patterns across multiple signals
- Identify competitive threats, feature gaps, and market trends
- Reference signals by their index in relatedSignalIndices
- Avoid duplicating existing feedback items
- When an insight could become feedback, include suggestedFeedbackTitle and suggestedFeedbackDescription

Respond with ONLY valid JSON matching this exact format:
{
  "insights": [
    {
      "type": "feature_suggestion|competitive_alert|market_opportunity|risk_warning",
      "title": "string",
      "summary": "string",
      "reasoning": "string",
      "priority": "critical|high|medium|low",
      "suggestedFeedbackTitle": "string (optional)",
      "suggestedFeedbackDescription": "string (optional)",
      "relatedSignalIndices": [0, 1, 2]
    }
  ]
}`;

    const userPrompt = `SIGNALS:
${signalsSummary}

EXISTING FEEDBACK (avoid duplicates):
${feedbackSummary}

Generate actionable insights from these signals.`;

    try {
      console.log(
        `[intelligence] Synthesis: generating insights from ${signals.length} signals`
      );
      const result = await generateStructured({
        model: SYNTHESIS_MODEL,
        prompt: userPrompt,
        schema: synthesisSchema,
        system: systemPrompt,
      });

      const { insights } = result;
      console.log(
        `[intelligence] Synthesis: AI generated ${insights.length} insights`
      );

      const insightsCreated = await storeInsights(
        ctx,
        insights,
        signals,
        existingFeedback,
        args.organizationId
      );

      console.log(
        `[intelligence] Synthesis: stored ${insightsCreated} insights in DB`
      );
      return { insightsCreated };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI parsing failed";
      console.error(`[intelligence] Synthesis failed: ${message}`);
      throw new Error(`Insight synthesis failed: ${message}`);
    }
  },
});

/**
 * Generate a battlecard for a competitor
 */
export const generateBattlecard = internalAction({
  args: {
    competitorId: v.id("competitors"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - SEVEN_DAYS_MS;

    const signals = await ctx.runQuery(
      internal.intelligence.synthesis.getRecentSignals,
      { organizationId: args.organizationId, since }
    );

    const competitorSignals = signals.filter(
      (s: { competitorId?: Id<"competitors"> }) =>
        s.competitorId === args.competitorId
    );

    const signalsSummary =
      competitorSignals.length > 0
        ? competitorSignals
            .map(
              (s: {
                signalType: string;
                source: string;
                title: string;
                content: string;
              }) =>
                `(${s.signalType}, ${s.source}) "${s.title}": ${s.content.slice(0, 500)}`
            )
            .join("\n\n")
        : "No recent competitor signals available.";

    const systemPrompt =
      'You are a competitive intelligence analyst. Generate a sales battlecard to help position against this competitor.\n\nRespond with ONLY valid JSON matching this exact format:\n{\n  "overview": "string",\n  "strengths": ["string"],\n  "weaknesses": ["string"],\n  "talkTracks": [{ "scenario": "string", "response": "string" }],\n  "objectionHandling": [{ "objection": "string", "rebuttal": "string" }]\n}';

    const userPrompt = `COMPETITOR SIGNALS:
${signalsSummary}

Generate a comprehensive sales battlecard.`;

    try {
      const result = await generateStructured({
        model: SYNTHESIS_MODEL,
        prompt: userPrompt,
        schema: battlecardSchema,
        system: systemPrompt,
      });

      const content = JSON.stringify(result);

      await ctx.runMutation(internal.intelligence.synthesis.upsertBattlecard, {
        competitorId: args.competitorId,
        content,
        organizationId: args.organizationId,
      });

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI parsing failed";
      throw new Error(`Battlecard generation failed: ${message}`);
    }
  },
});

/**
 * Generate/update the feature comparison matrix for an org
 */
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
        internal.intelligence.synthesis.upsertFeatureComparison,
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
