import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { generateStructured } from "./structured_output";

const SYNTHESIS_MODEL = "anthropic/claude-sonnet-4";

// ============================================
// AI SCHEMAS
// ============================================

const synthesisSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum([
        "feature_suggestion",
        "competitive_alert",
        "market_opportunity",
        "risk_warning",
      ]),
      title: z.string(),
      summary: z.string(),
      reasoning: z.string(),
      priority: z.enum(["critical", "high", "medium", "low"]),
      suggestedFeedbackTitle: z.string().optional(),
      suggestedFeedbackDescription: z.string().optional(),
      relatedSignalIndices: z
        .array(z.number())
        .describe("Indices into the signals array"),
    })
  ),
});

const battlecardSchema = z.object({
  overview: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  talkTracks: z.array(z.object({ scenario: z.string(), response: z.string() })),
  objectionHandling: z.array(
    z.object({ objection: z.string(), rebuttal: z.string() })
  ),
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
      title: f.title,
      description: f.description,
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
    organizationId: v.id("organizations"),
    signalIds: v.array(v.id("intelligenceSignals")),
    type: v.union(
      v.literal("feature_suggestion"),
      v.literal("competitive_alert"),
      v.literal("market_opportunity"),
      v.literal("risk_warning"),
      v.literal("battlecard")
    ),
    title: v.string(),
    summary: v.string(),
    reasoning: v.optional(v.string()),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    suggestedFeedbackTitle: v.optional(v.string()),
    suggestedFeedbackDescription: v.optional(v.string()),
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
  },
  handler: async (ctx, args) => {
    const insightId = await ctx.db.insert("intelligenceInsights", {
      organizationId: args.organizationId,
      signalIds: args.signalIds,
      type: args.type,
      title: args.title,
      summary: args.summary,
      reasoning: args.reasoning,
      priority: args.priority,
      suggestedFeedbackTitle: args.suggestedFeedbackTitle,
      suggestedFeedbackDescription: args.suggestedFeedbackDescription,
      linkedFeedbackIds: args.linkedFeedbackIds,
      status: "new",
      createdAt: Date.now(),
    });

    return insightId;
  },
});

/**
 * Create or update a battlecard for a competitor
 */
export const upsertBattlecard = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    competitorId: v.id("competitors"),
    content: v.string(),
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
        content: args.content,
        aiGeneratedAt: now,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    const battlecardId = await ctx.db.insert("battlecards", {
      organizationId: args.organizationId,
      competitorId: args.competitorId,
      content: args.content,
      aiGeneratedAt: now,
      lastUpdatedAt: now,
    });

    return battlecardId;
  },
});

/**
 * Create or update feature comparison for an org
 */
export const upsertFeatureComparison = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    features: v.array(
      v.object({
        featureName: v.string(),
        userProductHasIt: v.boolean(),
        competitors: v.array(
          v.object({
            competitorId: v.id("competitors"),
            hasIt: v.boolean(),
            details: v.optional(v.string()),
          })
        ),
      })
    ),
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
        features: args.features,
        aiGeneratedAt: now,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    const comparisonId = await ctx.db.insert("featureComparisons", {
      organizationId: args.organizationId,
      features: args.features,
      aiGeneratedAt: now,
      lastUpdatedAt: now,
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

    await ctx.runMutation(
      internal.autopilot.intelligence.synthesis.createInsight,
      {
        organizationId,
        signalIds: relatedSignalIds,
        type: insight.type,
        title: insight.title,
        summary: insight.summary,
        reasoning: insight.reasoning,
        priority: insight.priority,
        suggestedFeedbackTitle: insight.suggestedFeedbackTitle,
        suggestedFeedbackDescription: insight.suggestedFeedbackDescription,
        linkedFeedbackIds:
          matchedFeedbackIds.length > 0 ? matchedFeedbackIds : undefined,
      }
    );
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
      internal.autopilot.intelligence.synthesis.getRecentSignals,
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
      internal.autopilot.intelligence.synthesis.getExistingFeedback,
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
        schema: synthesisSchema,
        system: systemPrompt,
        prompt: userPrompt,
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
    organizationId: v.id("organizations"),
    competitorId: v.id("competitors"),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - SEVEN_DAYS_MS;

    const signals = await ctx.runQuery(
      internal.autopilot.intelligence.synthesis.getRecentSignals,
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
        schema: battlecardSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const content = JSON.stringify(result);

      await ctx.runMutation(
        internal.autopilot.intelligence.synthesis.upsertBattlecard,
        {
          organizationId: args.organizationId,
          competitorId: args.competitorId,
          content,
        }
      );

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
      internal.autopilot.intelligence.synthesis.getRecentSignals,
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
          featureName: z.string(),
          userProductHasIt: z.boolean(),
          competitors: z.array(
            z.object({
              competitorId: z.string().describe("The competitor ID"),
              hasIt: z.boolean(),
              details: z.string().optional(),
            })
          ),
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
        schema: featureComparisonSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      // Build a map of valid competitor IDs from signals for validation
      const validCompetitorIds = new Map<string, Id<"competitors">>();
      for (const s of featureSignals) {
        if (s.competitorId) {
          validCompetitorIds.set(s.competitorId, s.competitorId);
        }
      }

      const features = result.features.map((f) => ({
        featureName: f.featureName,
        userProductHasIt: f.userProductHasIt,
        competitors: f.competitors
          .filter((c) => validCompetitorIds.has(c.competitorId))
          .map((c) => {
            const typedId = validCompetitorIds.get(c.competitorId);
            if (!typedId) {
              throw new Error(`Invalid competitor ID: ${c.competitorId}`);
            }
            return {
              competitorId: typedId,
              hasIt: c.hasIt,
              details: c.details,
            };
          }),
      }));

      await ctx.runMutation(
        internal.autopilot.intelligence.synthesis.upsertFeatureComparison,
        {
          organizationId: args.organizationId,
          features,
        }
      );

      return { success: true, featureCount: features.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI parsing failed";
      throw new Error(`Feature comparison failed: ${message}`);
    }
  },
});
