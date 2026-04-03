import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const LLM_CHECK_MODEL = "qwen/qwen3.6-plus:free";

const visibilitySchema = z.object({
  mentionsProduct: z.boolean(),
  mentionedCompetitors: z.array(z.string()),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  context: z
    .string()
    .describe(
      "Brief description of how the product was mentioned or why it was not"
    ),
  recommendationStrength: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "How strongly the LLM recommends this product (0=not mentioned, 10=top recommendation)"
    ),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get LLM visibility results for an organization
 */
export const getVisibilityResults = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const results = await ctx.db
      .query("llmVisibilityChecks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return results;
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get org details and competitors for LLM visibility check
 */
export const getOrgForVisibility = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    return {
      orgName: org.name,
      competitors: competitors.map((c) => ({
        id: c._id,
        name: c.name,
      })),
    };
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Store LLM visibility check result
 */
export const storeVisibilityResult = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    prompt: v.string(),
    model: v.string(),
    mentionsProduct: v.boolean(),
    mentionedCompetitors: v.array(v.string()),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral")
    ),
    context: v.string(),
    recommendationStrength: v.number(),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmVisibilityChecks", args);
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Run LLM visibility check — asks an AI model common product questions
 * and checks if the user's product is mentioned vs competitors
 */
export const runVisibilityCheck = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const orgData = await ctx.runQuery(
      internal.autopilot.intelligence.llm_visibility.getOrgForVisibility,
      { organizationId: args.organizationId }
    );

    if (!orgData) {
      return;
    }

    const competitorNames = orgData.competitors
      .map((c: { name: string }) => c.name)
      .join(", ");

    // Generate common product discovery prompts
    const prompts = [
      "What are the best tools for collecting user feedback for a SaaS product?",
      "I need a feedback management platform. What are the top options?",
      "Compare feedback tools: which one should I use for my startup?",
      `What's the best alternative to Canny for user feedback?`,
    ];

    for (const prompt of prompts) {
      try {
        const response = await generateObject({
          model: openrouter(LLM_CHECK_MODEL),
          schema: visibilitySchema,
          system: `You are simulating how a large language model would respond to a user query.
The product we're checking visibility for is: ${orgData.orgName}
Known competitors in this space: ${competitorNames}

Answer the user's question naturally, then analyze your own response to determine:
- Whether you mentioned ${orgData.orgName}
- Which competitors you mentioned
- The sentiment of any mention
- How strongly you recommended ${orgData.orgName} (0 if not mentioned)`,
          prompt,
        });

        await ctx.runMutation(
          internal.autopilot.intelligence.llm_visibility.storeVisibilityResult,
          {
            organizationId: args.organizationId,
            prompt,
            model: LLM_CHECK_MODEL,
            mentionsProduct: response.object.mentionsProduct,
            mentionedCompetitors: response.object.mentionedCompetitors,
            sentiment: response.object.sentiment,
            context: response.object.context,
            recommendationStrength: response.object.recommendationStrength,
            checkedAt: Date.now(),
          }
        );
      } catch {
        // Skip failed prompts
      }
    }
  },
});
