/**
 * Chain producers — one action per chain node.
 *
 * Each producer:
 * 1. Verifies upstream dependencies are published (via chain state)
 * 2. Loads upstream context (single-context, no cross-agent note-passing)
 * 3. Generates the artifact in a single LLM call with pre-answer scaffolding
 * 4. Persists with status=pending_review (Validator scores it next)
 *
 * Producers do NOT scan, do NOT invent work, do NOT chain into other producers.
 * The heartbeat re-evaluates chain state and dispatches the next producer.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server";
import { computeChainState, isNodeReadyToProduce } from "../chain";
import { FAST_MODELS, QUALITY_MODELS } from "./models";
import { generateObjectWithFallback } from "./shared_generation";

const PRE_ANSWER = `
THINKING PROCESS — execute BEFORE generating output:
1. Identify any ambiguity in the inputs.
2. Choose the most defensible interpretation given the upstream documents.
3. If inputs are insufficient, return empty fields with a one-line reason.
4. Never invent facts, URLs, or competitor data.`;

// ============================================
// SHARED HELPERS
// ============================================

const fetchPublishedDocByType = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  type: Doc<"autopilotDocuments">["type"]
): Promise<Doc<"autopilotDocuments"> | null> => {
  const docs = await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", orgId).eq("type", type)
    )
    .order("desc")
    .take(10);
  return docs.find((d) => d.status === "published") ?? null;
};

export const getChainContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const chainState = await computeChainState(ctx, args.organizationId);

    const repoAnalysis = await ctx.db
      .query("autopilotRepoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    const codebaseDoc = await fetchPublishedDocByType(
      ctx,
      args.organizationId,
      "codebase_understanding"
    );
    const appDescDoc = await fetchPublishedDocByType(
      ctx,
      args.organizationId,
      "app_description"
    );
    const marketDoc = await fetchPublishedDocByType(
      ctx,
      args.organizationId,
      "market_research"
    );
    const targetDoc = await fetchPublishedDocByType(
      ctx,
      args.organizationId,
      "target_definition"
    );

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

    return {
      chainState,
      repoAnalysis,
      codebaseDoc,
      appDescDoc,
      marketDoc,
      targetDoc,
      personas,
      useCases,
    };
  },
});

export const writeChainDoc = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("codebase_understanding"),
      v.literal("app_description"),
      v.literal("market_research"),
      v.literal("target_definition"),
      v.literal("persona_brief")
    ),
    title: v.string(),
    content: v.string(),
    sourceAgent: v.union(
      v.literal("cto"),
      v.literal("pm"),
      v.literal("growth"),
      v.literal("sales")
    ),
    dependsOnDocIds: v.array(v.id("autopilotDocuments")),
    keyFindings: v.optional(v.array(v.string())),
  },
  returns: v.id("autopilotDocuments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      content: args.content,
      tags: ["chain"],
      sourceAgent: args.sourceAgent,
      status: "pending_review",
      needsReview: true,
      reviewType: "chain_artifact",
      dependsOnDocIds: args.dependsOnDocIds,
      keyFindings: args.keyFindings,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================
// PRODUCER: codebase_understanding (CTO)
// ============================================

const codebaseUnderstandingSchema = z.object({
  title: z.string(),
  techStackSummary: z.string(),
  primaryDomains: z.array(z.string()),
  architecturePatterns: z.array(z.string()),
  surfaceAreas: z.array(z.string()),
  integrationPoints: z.array(z.string()),
  keyFindings: z.array(z.string()),
});

const renderCodebaseDoc = (
  schema: z.infer<typeof codebaseUnderstandingSchema>
): string =>
  [
    `## Tech Stack\n${schema.techStackSummary}`,
    `## Primary Domains\n${schema.primaryDomains.map((d) => `- ${d}`).join("\n")}`,
    `## Architecture Patterns\n${schema.architecturePatterns.map((p) => `- ${p}`).join("\n")}`,
    `## Surface Areas\n${schema.surfaceAreas.map((s) => `- ${s}`).join("\n")}`,
    `## Integration Points\n${schema.integrationPoints.map((i) => `- ${i}`).join("\n")}`,
  ].join("\n\n");

export const produceCodebaseUnderstanding = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "codebase_understanding")) {
      return null;
    }
    if (!context.repoAnalysis) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "cto",
        level: "warning",
        message:
          "Cannot produce codebase_understanding: no repo analysis available",
      });
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: codebaseUnderstandingSchema,
      systemPrompt: `You are a senior CTO reading a repository analysis to produce a dense, factual understanding doc consumed by every downstream agent. No marketing fluff. ${PRE_ANSWER}`,
      prompt: `Repository analysis:\n${JSON.stringify(context.repoAnalysis, null, 2)}\n\nProduce a structured codebase_understanding document.`,
      temperature: 0,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.writeChainDoc,
      {
        organizationId: args.organizationId,
        type: "codebase_understanding",
        title: result.title,
        content: renderCodebaseDoc(result),
        sourceAgent: "cto",
        dependsOnDocIds: [],
        keyFindings: result.keyFindings,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: "Produced codebase_understanding (pending review)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: app_description (CTO)
// ============================================

const appDescriptionSchema = z.object({
  title: z.string(),
  oneLineSummary: z.string(),
  whatItDoes: z.string(),
  primaryUserVerbs: z.array(z.string()),
  valueProposition: z.string(),
  currentScope: z.string(),
  outOfScope: z.string(),
  keyFindings: z.array(z.string()),
});

const renderAppDescription = (
  schema: z.infer<typeof appDescriptionSchema>
): string =>
  [
    `## Summary\n${schema.oneLineSummary}`,
    `## What It Does\n${schema.whatItDoes}`,
    `## Primary User Verbs\n${schema.primaryUserVerbs.map((v) => `- ${v}`).join("\n")}`,
    `## Value Proposition\n${schema.valueProposition}`,
    `## Current Scope\n${schema.currentScope}`,
    `## Explicitly Out of Scope\n${schema.outOfScope}`,
  ].join("\n\n");

export const produceAppDescription = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "app_description")) {
      return null;
    }
    if (!context.codebaseDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: appDescriptionSchema,
      systemPrompt: `You are a senior CTO turning a codebase_understanding into a plain-language app description that downstream Growth and PM agents can consume. ${PRE_ANSWER}`,
      prompt: `Codebase understanding:\n${context.codebaseDoc.content}\n\nProduce a structured app_description.`,
      temperature: 0,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.writeChainDoc,
      {
        organizationId: args.organizationId,
        type: "app_description",
        title: result.title,
        content: renderAppDescription(result),
        sourceAgent: "cto",
        dependsOnDocIds: [context.codebaseDoc._id],
        keyFindings: result.keyFindings,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: "Produced app_description (pending review)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: market_analysis (Growth)
// ============================================

const marketAnalysisSchema = z.object({
  title: z.string(),
  positioning: z.string(),
  competitiveLandscape: z.string(),
  primaryAudienceVenues: z.array(z.string()),
  signals: z.array(z.string()),
  keyFindings: z.array(z.string()),
});

const renderMarketAnalysis = (
  schema: z.infer<typeof marketAnalysisSchema>
): string =>
  [
    `## Positioning\n${schema.positioning}`,
    `## Competitive Landscape\n${schema.competitiveLandscape}`,
    `## Primary Audience Venues\n${schema.primaryAudienceVenues.map((v) => `- ${v}`).join("\n")}`,
    `## Signals\n${schema.signals.map((s) => `- ${s}`).join("\n")}`,
  ].join("\n\n");

export const produceMarketAnalysis = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "market_analysis")) {
      return null;
    }
    if (!context.appDescDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: marketAnalysisSchema,
      systemPrompt: `You are a Growth specialist producing a structured market analysis from the published app_description. Use only the inputs provided — do not invent competitors. ${PRE_ANSWER}`,
      prompt: `App description:\n${context.appDescDoc.content}\n\nProduce a market_analysis.`,
      temperature: 0,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.writeChainDoc,
      {
        organizationId: args.organizationId,
        type: "market_research",
        title: result.title,
        content: renderMarketAnalysis(result),
        sourceAgent: "growth",
        dependsOnDocIds: [context.appDescDoc._id],
        keyFindings: result.keyFindings,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "growth",
      level: "success",
      message: "Produced market_analysis (pending review)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: target_definition (PM)
// ============================================

const targetDefinitionSchema = z.object({
  title: z.string(),
  whoWeServe: z.string(),
  problemWeSolve: z.string(),
  whoWeDoNotServe: z.string(),
  keyFindings: z.array(z.string()),
});

const renderTargetDefinition = (
  schema: z.infer<typeof targetDefinitionSchema>
): string =>
  [
    `## Who We Serve\n${schema.whoWeServe}`,
    `## Problem We Solve\n${schema.problemWeSolve}`,
    `## Who We Do NOT Serve\n${schema.whoWeDoNotServe}`,
  ].join("\n\n");

export const produceTargetDefinition = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "target_definition")) {
      return null;
    }
    if (!(context.appDescDoc && context.marketDoc)) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: targetDefinitionSchema,
      systemPrompt: `You are a senior PM producing a strict target_definition. Be sharp about who we DO NOT serve — exclusion is as important as inclusion. ${PRE_ANSWER}`,
      prompt: `App description:\n${context.appDescDoc.content}\n\nMarket analysis:\n${context.marketDoc.content}`,
      temperature: 0,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.writeChainDoc,
      {
        organizationId: args.organizationId,
        type: "target_definition",
        title: result.title,
        content: renderTargetDefinition(result),
        sourceAgent: "pm",
        dependsOnDocIds: [context.appDescDoc._id, context.marketDoc._id],
        keyFindings: result.keyFindings,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "pm",
      level: "success",
      message: "Produced target_definition (pending review)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: personas (PM)
// ============================================

const personasSchema = z.object({
  personas: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        role: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        painPoints: z.array(z.string()),
        goals: z.array(z.string()),
        alternativesConsidered: z.array(z.string()),
        channels: z.array(z.string()),
      })
    )
    .min(2)
    .max(5),
});

export const producePersonas = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "personas")) {
      return null;
    }
    if (!context.targetDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: personasSchema,
      systemPrompt: `You are a senior PM producing 3-5 sharp personas from the target_definition. Each persona must be distinct (no overlapping pain points). ${PRE_ANSWER}`,
      prompt: `Target definition:\n${context.targetDoc.content}\n\nMarket analysis:\n${context.marketDoc?.content ?? ""}`,
      temperature: 0,
    });

    for (const p of result.personas) {
      await ctx.runMutation(
        internal.autopilot.mutations.personas.createPersona,
        {
          organizationId: args.organizationId,
          name: p.name,
          description: p.description,
          role: p.role,
          industry: p.industry,
          companySize: p.companySize,
          painPoints: p.painPoints,
          goals: p.goals,
          alternativesConsidered: p.alternativesConsidered,
          channels: p.channels,
          sourceDocIds: [context.targetDoc._id],
        }
      );
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "pm",
      level: "success",
      message: `Produced ${result.personas.length} personas`,
    });
    return null;
  },
});

// ============================================
// PRODUCER: use_cases (PM)
// ============================================

const useCasesSchema = z.object({
  useCases: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        personaName: z.string(),
        triggerScenario: z.string(),
        expectedOutcome: z.string(),
      })
    )
    .min(3)
    .max(15),
});

export const produceUseCases = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "use_cases")) {
      return null;
    }
    if (context.personas.length === 0) {
      return null;
    }

    const personasForPrompt = context.personas.map((p) => ({
      _id: p._id,
      name: p.name,
      painPoints: p.painPoints,
      goals: p.goals,
    }));

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: useCasesSchema,
      systemPrompt: `You are a senior PM enumerating concrete use cases. One use case per (persona × pain) combination. Trigger scenarios must be specific. ${PRE_ANSWER}`,
      prompt: `Personas:\n${JSON.stringify(personasForPrompt, null, 2)}\n\nApp description:\n${context.appDescDoc?.content ?? ""}`,
      temperature: 0,
    });

    const personaIdByName = new Map(
      context.personas.map((p) => [p.name, p._id])
    );

    for (const uc of result.useCases) {
      const personaId = personaIdByName.get(uc.personaName);
      if (!personaId) {
        continue;
      }
      await ctx.runMutation(
        internal.autopilot.mutations.use_cases.createUseCase,
        {
          organizationId: args.organizationId,
          title: uc.title,
          description: uc.description,
          personaIds: [personaId],
          triggerScenario: uc.triggerScenario,
          expectedOutcome: uc.expectedOutcome,
          sourceDocIds: context.targetDoc ? [context.targetDoc._id] : [],
        }
      );
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "pm",
      level: "success",
      message: `Produced ${result.useCases.length} use cases (pending validator scoring)`,
    });
    return null;
  },
});
