import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { generateStructured } from "./structured_output";
import {
  SEVEN_DAYS_MS,
  SYNTHESIS_MODEL,
  type SynthesisInsights,
  synthesisSchema,
} from "./synthesis_shared";

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

const storeInsights = async (
  ctx: ActionCtx,
  insights: SynthesisInsights,
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
