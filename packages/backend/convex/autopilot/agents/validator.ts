/**
 * Validator agent — single-purpose scoring of artifacts.
 *
 * Does NOT generate content. Does NOT scan. Does NOT pass notes.
 * It loads pending artifacts (without `validation`), scores them against
 * fixed rubrics, writes the score back to the artifact, and exits.
 *
 * Validation bottleneck recommended by Cemri et al. 2025 — reduces logical
 * contradictions by 36.4% and context omissions by 66.8% in centralized MAS.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { QUALITY_MODELS } from "./models";
import { generateObjectWithFallback } from "./shared_generation";
import {
  buildValidatorPrompt,
  DRAFT_RUBRIC,
  USE_CASE_RUBRIC,
} from "./validator_prompts";

const MAX_ARTIFACTS_PER_PASS = 5;

const DEFAULT_WEIGHTS = {
  cost: 0.15,
  devComplexity: 0.15,
  maintainability: 0.15,
  utility: 0.35,
  audienceBreadth: 0.2,
};

const DRAFT_DOC_TYPES = [
  "blog_post",
  "reddit_reply",
  "linkedin_post",
  "twitter_post",
  "hn_comment",
  "email",
  "changelog",
] as const;

type DraftDocType = (typeof DRAFT_DOC_TYPES)[number];

const isDraftDocType = (
  type: Doc<"autopilotDocuments">["type"]
): type is DraftDocType => DRAFT_DOC_TYPES.includes(type as DraftDocType);

const validatorScoreSchema = z.object({
  cost: z.number().min(0).max(100),
  devComplexity: z.number().min(0).max(100),
  maintainability: z.number().min(0).max(100),
  utility: z.number().min(0).max(100),
  audienceBreadth: z.number().min(0).max(100),
  rationale: z.string(),
  recommendation: z.enum(["publish", "revise", "reject"]),
});

const validatorScoreValidator = v.object({
  cost: v.number(),
  devComplexity: v.number(),
  maintainability: v.number(),
  utility: v.number(),
  audienceBreadth: v.number(),
  composite: v.number(),
  rationale: v.string(),
  recommendation: v.union(
    v.literal("publish"),
    v.literal("revise"),
    v.literal("reject")
  ),
  scoredAt: v.number(),
});

const computeComposite = (
  scores: {
    cost: number;
    devComplexity: number;
    maintainability: number;
    utility: number;
    audienceBreadth: number;
  },
  weights: typeof DEFAULT_WEIGHTS
): number =>
  Math.round(
    scores.cost * weights.cost +
      scores.devComplexity * weights.devComplexity +
      scores.maintainability * weights.maintainability +
      scores.utility * weights.utility +
      scores.audienceBreadth * weights.audienceBreadth
  );

// ============================================
// QUERIES — fetch artifacts pending validation
// ============================================

export const getPendingValidationArtifacts = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const pendingDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .take(MAX_ARTIFACTS_PER_PASS * 2);

    const docsToScore = pendingDocs
      .filter((d) => !d.validation)
      .slice(0, MAX_ARTIFACTS_PER_PASS);

    const pendingUseCases = await ctx.db
      .query("autopilotUseCases")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .take(MAX_ARTIFACTS_PER_PASS * 2);

    const useCasesToScore = pendingUseCases
      .filter((u) => !u.validation)
      .slice(0, MAX_ARTIFACTS_PER_PASS);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return {
      docs: docsToScore,
      useCases: useCasesToScore,
      weights: config?.validatorWeights ?? DEFAULT_WEIGHTS,
    };
  },
});

const fetchUpstreamContext = async (
  ctx: { db: import("../../_generated/server").QueryCtx["db"] },
  orgId: Id<"organizations">,
  dependsOnDocIds: Id<"autopilotDocuments">[] | undefined
): Promise<string> => {
  if (!dependsOnDocIds || dependsOnDocIds.length === 0) {
    return "(no explicit upstream context provided)";
  }
  const upstream: Array<{ type: string; title: string; content: string }> = [];
  for (const id of dependsOnDocIds.slice(0, 5)) {
    const doc = await ctx.db.get(id);
    if (doc && doc.organizationId === orgId) {
      upstream.push({
        type: doc.type,
        title: doc.title,
        content: doc.content.slice(0, 2000),
      });
    }
  }
  return JSON.stringify(upstream, null, 2);
};

export const getUpstreamContextForDoc = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    docId: v.id("autopilotDocuments"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) {
      return "(artifact not found)";
    }
    return await fetchUpstreamContext(
      ctx,
      args.organizationId,
      doc.dependsOnDocIds
    );
  },
});

export const getUpstreamContextForUseCase = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    useCaseId: v.id("autopilotUseCases"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const uc = await ctx.db.get(args.useCaseId);
    if (!uc) {
      return "(use case not found)";
    }
    return await fetchUpstreamContext(
      ctx,
      args.organizationId,
      uc.sourceDocIds
    );
  },
});

// ============================================
// MUTATIONS — write back validation scores
// ============================================

export const writeDocValidation = internalMutation({
  args: {
    docId: v.id("autopilotDocuments"),
    validation: validatorScoreValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, {
      validation: args.validation,
      updatedAt: Date.now(),
    });
  },
});

export const writeUseCaseValidation = internalMutation({
  args: {
    useCaseId: v.id("autopilotUseCases"),
    validation: validatorScoreValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.useCaseId, {
      validation: args.validation,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// ACTION — main validator pass
// ============================================

const scoreArtifact = async (
  rubric: string,
  artifactJson: string,
  upstreamJson: string,
  weights: typeof DEFAULT_WEIGHTS
) => {
  const prompt = buildValidatorPrompt(
    rubric,
    artifactJson,
    upstreamJson,
    JSON.stringify(weights)
  );
  const result = await generateObjectWithFallback({
    models: QUALITY_MODELS,
    schema: validatorScoreSchema,
    prompt,
    systemPrompt:
      "You are a strict validator. Apply the rubric exactly. Never invent facts.",
    temperature: 0,
  });
  return {
    ...result,
    composite: computeComposite(result, weights),
    scoredAt: Date.now(),
  };
};

const pickRubricForDoc = (doc: Doc<"autopilotDocuments">): string | null => {
  if (isDraftDocType(doc.type)) {
    return DRAFT_RUBRIC;
  }
  return null;
};

export const runValidatorPass = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { docs, useCases, weights } = await ctx.runQuery(
      internal.autopilot.agents.validator.getPendingValidationArtifacts,
      { organizationId: args.organizationId }
    );

    for (const doc of docs) {
      const rubric = pickRubricForDoc(doc);
      if (!rubric) {
        continue;
      }
      try {
        const upstreamJson = await ctx.runQuery(
          internal.autopilot.agents.validator.getUpstreamContextForDoc,
          { organizationId: args.organizationId, docId: doc._id }
        );
        const validation = await scoreArtifact(
          rubric,
          JSON.stringify({
            type: doc.type,
            title: doc.title,
            content: doc.content.slice(0, 4000),
            platform: doc.platform,
            targetUrl: doc.targetUrl,
          }),
          upstreamJson,
          weights
        );
        await ctx.runMutation(
          internal.autopilot.agents.validator.writeDocValidation,
          { docId: doc._id, validation }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Validator scoring failed";
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          agent: "validator",
          level: "error",
          message: `Failed to score doc ${doc._id}: ${message}`,
        });
      }
    }

    for (const uc of useCases) {
      try {
        const upstreamJson = await ctx.runQuery(
          internal.autopilot.agents.validator.getUpstreamContextForUseCase,
          { organizationId: args.organizationId, useCaseId: uc._id }
        );
        const validation = await scoreArtifact(
          USE_CASE_RUBRIC,
          JSON.stringify({
            title: uc.title,
            description: uc.description,
            triggerScenario: uc.triggerScenario,
            expectedOutcome: uc.expectedOutcome,
          }),
          upstreamJson,
          weights
        );
        await ctx.runMutation(
          internal.autopilot.agents.validator.writeUseCaseValidation,
          { useCaseId: uc._id, validation }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Validator scoring failed";
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          agent: "validator",
          level: "error",
          message: `Failed to score use case ${uc._id}: ${message}`,
        });
      }
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "validator",
      level: "success",
      message: `Validator pass: scored ${docs.length} doc(s) and ${useCases.length} use case(s)`,
    });

    return null;
  },
});
