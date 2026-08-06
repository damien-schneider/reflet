import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { generateStructured } from "./structured_output";
import {
  battlecardSchema,
  SEVEN_DAYS_MS,
  SYNTHESIS_MODEL,
} from "./synthesis_shared";

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

      await ctx.runMutation(
        internal.intelligence.battlecards.upsertBattlecard,
        {
          competitorId: args.competitorId,
          content,
          organizationId: args.organizationId,
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
