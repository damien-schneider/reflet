/**
 * Community Discovery — chain producer for community_posts node.
 *
 * Consumes published personas + use_cases. Searches communities for posts
 * (individual comments, not threads) matching persona pain points or use case
 * triggers. Persists each match in autopilotCommunityPosts. The Validator
 * agent scores them downstream.
 *
 * Single-context, single-purpose. Does NOT generate drafts (that's the Growth
 * drafts producer node, which consumes scored community_posts).
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";
import { computeChainState, isNodeReadyToProduce } from "../chain";
import { FAST_MODELS } from "./models";
import { generateObjectWithFallback } from "./shared_generation";
import { executeSearchQueries, type SearchQuery } from "./shared_search";

const MAX_QUERIES_PER_RUN = 6;
const MAX_POSTS_TO_PERSIST = 12;

const platformFromUrl = (
  url: string
):
  | "reddit"
  | "hackernews"
  | "twitter"
  | "linkedin"
  | "indiehackers"
  | "devto"
  | "other" => {
  if (url.includes("reddit.com")) {
    return "reddit";
  }
  if (url.includes("news.ycombinator.com")) {
    return "hackernews";
  }
  if (url.includes("twitter.com") || url.includes("x.com")) {
    return "twitter";
  }
  if (url.includes("linkedin.com")) {
    return "linkedin";
  }
  if (url.includes("indiehackers.com")) {
    return "indiehackers";
  }
  if (url.includes("dev.to")) {
    return "devto";
  }
  return "other";
};

export const getCommunityDiscoveryContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const chainState = await computeChainState(ctx, args.organizationId);

    const personas = await ctx.db
      .query("autopilotPersonas")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const useCases = await ctx.db
      .query("autopilotUseCases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return { chainState, personas, useCases };
  },
});

const queryPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        intent: z.enum([
          "problem_search",
          "competitor_alternative",
          "pain_point",
          "recommendation_request",
          "lead_signal",
          "company_signal",
        ]),
        platform: z.enum([
          "reddit",
          "hackernews",
          "twitter",
          "linkedin",
          "general",
        ]),
        query: z.string(),
        targetPersonaName: z.string(),
        targetUseCaseTitle: z.string().optional(),
      })
    )
    .min(1)
    .max(MAX_QUERIES_PER_RUN),
});

const matchSchema = z.object({
  matches: z.array(
    z.object({
      sourceUrl: z.string(),
      authorName: z.string(),
      content: z.string(),
      title: z.string().optional(),
      relevanceReason: z.string(),
      personaName: z.string(),
      useCaseTitle: z.string().optional(),
    })
  ),
});

export const runCommunityDiscovery = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { chainState, personas, useCases } = await ctx.runQuery(
      internal.autopilot.agents.community_discovery
        .getCommunityDiscoveryContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(chainState, "community_posts")) {
      return null;
    }
    if (personas.length === 0 || useCases.length === 0) {
      return null;
    }

    const planResult = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: queryPlanSchema,
      systemPrompt: `You are a Growth specialist planning community searches. Generate ${MAX_QUERIES_PER_RUN} targeted queries that find INDIVIDUAL COMMENTS (not entire threads) where someone is expressing a persona's pain point or use case trigger. Mix platforms.`,
      prompt: `Personas:\n${JSON.stringify(
        personas.map((p) => ({
          name: p.name,
          painPoints: p.painPoints,
          channels: p.channels,
        })),
        null,
        2
      )}\n\nUse cases:\n${JSON.stringify(
        useCases.map((u) => ({ title: u.title, trigger: u.triggerScenario })),
        null,
        2
      )}`,
      temperature: 0.2,
    });

    const searchQueries: SearchQuery[] = planResult.queries.map((q) => ({
      intent: q.intent,
      platform: q.platform,
      query: q.query,
    }));

    const discovered = await executeSearchQueries(searchQueries);
    if (discovered.length === 0) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "growth",
        level: "info",
        message: "Community discovery: no matches found",
      });
      return null;
    }

    const matchResult = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: matchSchema,
      systemPrompt:
        "You are matching discovered threads to personas and use cases. Only return matches where the discovered URL clearly contains a comment from a real person expressing the targeted pain or trigger. Never invent URLs or quotes — extract from the search snippet only.",
      prompt: `Discovered threads:\n${JSON.stringify(discovered.slice(0, 30), null, 2)}\n\nPersonas:\n${JSON.stringify(
        personas.map((p) => ({ name: p.name, painPoints: p.painPoints })),
        null,
        2
      )}\n\nUse cases:\n${JSON.stringify(
        useCases.map((u) => ({ title: u.title, trigger: u.triggerScenario })),
        null,
        2
      )}`,
      temperature: 0,
    });

    const personaIdByName = new Map(personas.map((p) => [p.name, p._id]));
    const useCaseIdByTitle = new Map(useCases.map((u) => [u.title, u._id]));

    let persistedCount = 0;
    for (const match of matchResult.matches.slice(0, MAX_POSTS_TO_PERSIST)) {
      const personaId = personaIdByName.get(match.personaName);
      if (!personaId) {
        continue;
      }
      const useCaseId = match.useCaseTitle
        ? useCaseIdByTitle.get(match.useCaseTitle)
        : undefined;

      await ctx.runMutation(
        internal.autopilot.mutations.community_posts.createCommunityPost,
        {
          organizationId: args.organizationId,
          platform: platformFromUrl(match.sourceUrl),
          authorName: match.authorName,
          authorUrl: undefined,
          title: match.title,
          content: match.content,
          sourceUrl: match.sourceUrl,
          parentThreadUrl: undefined,
          publishedAt: undefined,
          matchedPersonaIds: [personaId],
          matchedUseCaseIds: useCaseId ? [useCaseId] : [],
        }
      );
      persistedCount++;
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "growth",
      level: "success",
      message: `Community discovery: persisted ${persistedCount} post(s) from ${discovered.length} search results`,
    });

    return null;
  },
});
