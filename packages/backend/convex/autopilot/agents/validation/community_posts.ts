/**
 * Community post validation — scores discovered outreach opportunities.
 *
 * The main Validator agent scores documents and use cases. This module keeps
 * community post scoring separate so the Growth drafts node only consumes
 * posts that have passed the outreach relevance rubric.
 */

import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../../../_generated/server";
import { validatorScoreObject } from "../../schema/use_cases.tables";
import { communityPlatform } from "../../schema/validators";
import { QUALITY_MODELS } from "../models";
import { generateObjectWithFallback } from "../shared_generation";
import {
  computeComposite,
  DEFAULT_WEIGHTS,
  validatorScoreSchema,
} from "../validator";
import {
  buildValidatorPrompt,
  COMMUNITY_POST_RUBRIC,
} from "../validator_prompts";

const MAX_POSTS_PER_PASS = 5;
const CONTEXT_DOC_TYPES = ["app_description", "target_definition"] as const;

const communityPostValidationTarget = v.object({
  _id: v.id("autopilotCommunityPosts"),
  authorName: v.string(),
  content: v.string(),
  matchedPersonaIds: v.array(v.id("autopilotPersonas")),
  matchedUseCaseIds: v.array(v.id("autopilotUseCases")),
  platform: communityPlatform,
  sourceUrl: v.string(),
  title: v.optional(v.string()),
});

export const getPendingCommunityPostValidationArtifacts = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(communityPostValidationTarget),
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("autopilotCommunityPosts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(MAX_POSTS_PER_PASS * 2);

    return posts
      .filter((post) => !post.validation)
      .slice(0, MAX_POSTS_PER_PASS)
      .map((post) => ({
        _id: post._id,
        authorName: post.authorName,
        content: post.content,
        matchedPersonaIds: post.matchedPersonaIds,
        matchedUseCaseIds: post.matchedUseCaseIds,
        platform: post.platform,
        sourceUrl: post.sourceUrl,
        title: post.title,
      }));
  },
});

const getContextDocs = async (
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
) => {
  const docs: Array<{ content: string; title: string; type: string }> = [];
  for (const docType of CONTEXT_DOC_TYPES) {
    const matches = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", docType)
      )
      .take(1);
    const doc = matches[0];
    if (doc) {
      docs.push({
        content: doc.content.slice(0, 2000),
        title: doc.title,
        type: doc.type,
      });
    }
  }
  return docs;
};

export const getCommunityPostValidationContext = internalQuery({
  args: {
    communityPostId: v.id("autopilotCommunityPosts"),
    organizationId: v.id("organizations"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.communityPostId);
    if (!post || post.organizationId !== args.organizationId) {
      return "(community post not found)";
    }

    const personas: Array<{
      channels: string[];
      name: string;
      painPoints: string[];
    }> = [];
    for (const personaId of post.matchedPersonaIds.slice(0, 5)) {
      const persona = await ctx.db.get(personaId);
      if (persona && persona.organizationId === args.organizationId) {
        personas.push({
          channels: persona.channels,
          name: persona.name,
          painPoints: persona.painPoints,
        });
      }
    }

    const useCases: Array<{
      expectedOutcome?: string;
      title: string;
      triggerScenario?: string;
    }> = [];
    for (const useCaseId of post.matchedUseCaseIds.slice(0, 5)) {
      const useCase = await ctx.db.get(useCaseId);
      if (useCase && useCase.organizationId === args.organizationId) {
        useCases.push({
          expectedOutcome: useCase.expectedOutcome,
          title: useCase.title,
          triggerScenario: useCase.triggerScenario,
        });
      }
    }

    const contextDocs = await getContextDocs(ctx, args.organizationId);
    return JSON.stringify({ contextDocs, personas, useCases }, null, 2);
  },
});

export const writeCommunityPostValidation = internalMutation({
  args: {
    communityPostId: v.id("autopilotCommunityPosts"),
    validation: validatorScoreObject,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.communityPostId, {
      validation: args.validation,
      updatedAt: Date.now(),
    });
    return null;
  },
});

const scoreCommunityPost = async (
  post: {
    authorName: string;
    content: string;
    platform: string;
    sourceUrl: string;
    title?: string;
  },
  upstreamJson: string,
  weights: typeof DEFAULT_WEIGHTS
) => {
  const prompt = buildValidatorPrompt(
    COMMUNITY_POST_RUBRIC,
    JSON.stringify({
      authorName: post.authorName,
      content: post.content.slice(0, 4000),
      platform: post.platform,
      sourceUrl: post.sourceUrl,
      title: post.title,
    }),
    upstreamJson,
    JSON.stringify(weights)
  );
  const result = await generateObjectWithFallback({
    models: QUALITY_MODELS,
    schema: validatorScoreSchema,
    prompt,
    systemPrompt:
      "You are a strict outreach relevance validator. Apply the rubric exactly. Never invent facts.",
    temperature: 0,
  });
  return {
    ...result,
    composite: computeComposite(result, weights),
    scoredAt: Date.now(),
  };
};

export const runCommunityPostValidatorPass = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const posts = await ctx.runQuery(
      internal.autopilot.agents.validation.community_posts
        .getPendingCommunityPostValidationArtifacts,
      { organizationId: args.organizationId }
    );

    for (const post of posts) {
      try {
        const upstreamJson = await ctx.runQuery(
          internal.autopilot.agents.validation.community_posts
            .getCommunityPostValidationContext,
          {
            communityPostId: post._id,
            organizationId: args.organizationId,
          }
        );
        const validation = await scoreCommunityPost(
          post,
          upstreamJson,
          DEFAULT_WEIGHTS
        );
        await ctx.runMutation(
          internal.autopilot.agents.validation.community_posts
            .writeCommunityPostValidation,
          { communityPostId: post._id, validation }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Community post validation failed";
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          agent: "validator",
          level: "error",
          message: `Failed to score community post ${post._id}: ${message}`,
        });
      }
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "validator",
      level: "success",
      message: `Community validator pass: scored ${posts.length} post(s)`,
    });

    return null;
  },
});
