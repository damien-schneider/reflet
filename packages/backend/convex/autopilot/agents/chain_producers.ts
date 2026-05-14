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

interface RepoAnalysisPrecondition {
  githubConnected: boolean;
  integrationError: string | null;
  integrationStatus:
    | "missing"
    | "pending"
    | "in_progress"
    | "completed"
    | "error";
}

const CONNECT_GITHUB_HINT =
  "Connect a GitHub repository in Settings → GitHub to unblock the chain.";
const RUN_ANALYSIS_HINT =
  "Open Autopilot → Knowledge and click Recompute to run the first repo analysis.";
const WAITING_HINT =
  "A repo analysis is running. The chain will resume automatically when it completes.";

function describeRepoAnalysisBlocker(precondition: RepoAnalysisPrecondition): {
  message: string;
  details: string;
} {
  if (!precondition.githubConnected) {
    return {
      message:
        "Cannot produce codebase_understanding: no GitHub repository connected",
      details: CONNECT_GITHUB_HINT,
    };
  }
  if (precondition.integrationStatus === "missing") {
    return {
      message:
        "Cannot produce codebase_understanding: no repo analysis has been run yet",
      details: RUN_ANALYSIS_HINT,
    };
  }
  if (
    precondition.integrationStatus === "pending" ||
    precondition.integrationStatus === "in_progress"
  ) {
    return {
      message:
        "Cannot produce codebase_understanding: repo analysis still running",
      details: WAITING_HINT,
    };
  }
  if (precondition.integrationStatus === "error") {
    return {
      message:
        "Cannot produce codebase_understanding: last repo analysis failed",
      details: `${precondition.integrationError ?? "Unknown analysis error"}. ${RUN_ANALYSIS_HINT}`,
    };
  }
  return {
    message:
      "Cannot produce codebase_understanding: repo analysis completed but internal record is empty",
    details: RUN_ANALYSIS_HINT,
  };
}

export const getRepoAnalysisPrecondition = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    githubConnected: v.boolean(),
    integrationStatus: v.union(
      v.literal("missing"),
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("error")
    ),
    integrationError: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<RepoAnalysisPrecondition> => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
    const githubConnected = Boolean(connection?.repositoryFullName);

    const integration = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return {
      githubConnected,
      integrationStatus: integration?.status ?? "missing",
      integrationError: integration?.error ?? null,
    };
  },
});

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
    const findKnowledgeDoc = async (
      docType: "identity" | "brand_voice" | "feature_catalog" | "scope"
    ) =>
      await ctx.db
        .query("autopilotKnowledgeDocs")
        .withIndex("by_org_docType", (q) =>
          q.eq("organizationId", args.organizationId).eq("docType", docType)
        )
        .unique();

    const identityDoc = await findKnowledgeDoc("identity");
    const brandVoiceDoc = await findKnowledgeDoc("brand_voice");
    const featureCatalogDoc = await findKnowledgeDoc("feature_catalog");
    const scopeDoc = await findKnowledgeDoc("scope");
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
      identityDoc,
      brandVoiceDoc,
      featureCatalogDoc,
      scopeDoc,
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

const KNOWLEDGE_DOC_STALENESS_DAYS = 30;

/**
 * Chain producer write into autopilotKnowledgeDocs (single source of truth
 * for user-facing canonical artifacts). Skips overwrite if user has edited
 * the doc within the protection window — preserves human authorship.
 */
export const upsertChainKnowledgeDoc = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    docType: v.union(
      v.literal("target_audience"),
      v.literal("identity"),
      v.literal("brand_voice"),
      v.literal("feature_catalog"),
      v.literal("scope")
    ),
    ownerAgent: v.string(),
    title: v.string(),
    contentFull: v.string(),
    contentSummary: v.string(),
  },
  returns: v.id("autopilotKnowledgeDocs"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId).eq("docType", args.docType)
      )
      .unique();

    if (existing) {
      if (
        existing.userEditProtectedUntil &&
        existing.userEditProtectedUntil > now
      ) {
        return existing._id;
      }

      const newVersion = existing.version + 1;
      await ctx.db.patch(existing._id, {
        title: args.title,
        contentFull: args.contentFull,
        contentSummary: args.contentSummary,
        version: newVersion,
        userEdited: false,
        lastUpdatedAt: now,
      });
      await ctx.db.insert("autopilotKnowledgeDocVersions", {
        docId: existing._id,
        version: newVersion,
        content: args.contentFull,
        editedBy: "agent",
        editingAgent: args.ownerAgent,
        createdAt: now,
      });
      return existing._id;
    }

    const docId = await ctx.db.insert("autopilotKnowledgeDocs", {
      organizationId: args.organizationId,
      docType: args.docType,
      ownerAgent: args.ownerAgent,
      title: args.title,
      contentFull: args.contentFull,
      contentSummary: args.contentSummary,
      version: 1,
      userEdited: false,
      stalenessAlertDays: KNOWLEDGE_DOC_STALENESS_DAYS,
      lastUpdatedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("autopilotKnowledgeDocVersions", {
      docId,
      version: 1,
      content: args.contentFull,
      editedBy: "agent",
      editingAgent: args.ownerAgent,
      createdAt: now,
    });
    return docId;
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
      const precondition = await ctx.runQuery(
        internal.autopilot.agents.chain_producers.getRepoAnalysisPrecondition,
        { organizationId: args.organizationId }
      );
      const { message, details } = describeRepoAnalysisBlocker(precondition);
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "cto",
        level: "warning",
        message,
        details,
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
// SHARED: empty-doc validation
// ============================================

export class EmptyChainArtifactError extends Error {
  constructor(node: string, field: string) {
    super(
      `Chain producer for "${node}" returned an empty "${field}" — refusing to persist`
    );
    this.name = "EmptyChainArtifactError";
  }
}

export const assertNonEmpty = (
  node: string,
  fields: Record<string, string | string[]>
): void => {
  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      if (value.length === 0 || value.every((v) => v.trim() === "")) {
        throw new EmptyChainArtifactError(node, field);
      }
      continue;
    }
    if (value.trim() === "") {
      throw new EmptyChainArtifactError(node, field);
    }
  }
};

// ============================================
// PRODUCER: identity (CTO)
// ============================================

const identitySchema = z.object({
  title: z.string(),
  oneLineSummary: z.string(),
  whatItDoes: z.string(),
  primaryUserVerbs: z.array(z.string()).min(1),
  valueProposition: z.string(),
});

const renderIdentity = (schema: z.infer<typeof identitySchema>): string =>
  [
    `## Summary\n${schema.oneLineSummary}`,
    `## What It Does\n${schema.whatItDoes}`,
    `## Primary User Verbs\n${schema.primaryUserVerbs.map((v) => `- ${v}`).join("\n")}`,
    `## Value Proposition\n${schema.valueProposition}`,
  ].join("\n\n");

export const produceIdentity = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "identity")) {
      return null;
    }
    if (!context.codebaseDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: identitySchema,
      systemPrompt: `You are a senior CTO distilling the product identity from a codebase_understanding. Produce a tight, plain-language identity statement that downstream Growth and PM agents can ground on. ${PRE_ANSWER}`,
      prompt: `Codebase understanding:\n${context.codebaseDoc.content}\n\nProduce a structured product identity (summary, what it does, user verbs, value prop).`,
      temperature: 0,
    });

    assertNonEmpty("identity", {
      oneLineSummary: result.oneLineSummary,
      whatItDoes: result.whatItDoes,
      valueProposition: result.valueProposition,
      primaryUserVerbs: result.primaryUserVerbs,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.upsertChainKnowledgeDoc,
      {
        organizationId: args.organizationId,
        docType: "identity",
        ownerAgent: "cto",
        title: result.title,
        contentFull: renderIdentity(result),
        contentSummary: result.oneLineSummary.slice(0, 200),
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: "Produced identity (knowledge doc)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: brand_voice (CTO)
// ============================================

const brandVoiceSchema = z.object({
  title: z.string(),
  tone: z.string(),
  audienceFraming: z.string(),
  doList: z.array(z.string()).min(1),
  dontList: z.array(z.string()).min(1),
  vocabulary: z.array(z.string()),
});

const renderBrandVoice = (schema: z.infer<typeof brandVoiceSchema>): string =>
  [
    `## Tone\n${schema.tone}`,
    `## Audience Framing\n${schema.audienceFraming}`,
    `## Do\n${schema.doList.map((d) => `- ${d}`).join("\n")}`,
    `## Don't\n${schema.dontList.map((d) => `- ${d}`).join("\n")}`,
    `## Vocabulary\n${schema.vocabulary.map((v) => `- ${v}`).join("\n")}`,
  ].join("\n\n");

export const produceBrandVoice = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "brand_voice")) {
      return null;
    }
    if (!context.codebaseDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: brandVoiceSchema,
      systemPrompt: `You are a senior CTO inferring brand voice cues from a codebase_understanding (UI copy, doc style, package naming, product surfaces). Be conservative — voice should match what the product actually communicates today, not aspirational. ${PRE_ANSWER}`,
      prompt: `Codebase understanding:\n${context.codebaseDoc.content}\n\nProduce a structured brand voice (tone, audience framing, do/don't, vocabulary).`,
      temperature: 0,
    });

    assertNonEmpty("brand_voice", {
      tone: result.tone,
      audienceFraming: result.audienceFraming,
      doList: result.doList,
      dontList: result.dontList,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.upsertChainKnowledgeDoc,
      {
        organizationId: args.organizationId,
        docType: "brand_voice",
        ownerAgent: "cto",
        title: result.title,
        contentFull: renderBrandVoice(result),
        contentSummary: result.tone.slice(0, 200),
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: "Produced brand_voice (knowledge doc)",
    });
    return null;
  },
});

// ============================================
// PRODUCER: feature_catalog (CTO)
// ============================================

const featureCatalogSchema = z.object({
  title: z.string(),
  features: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        userBenefit: z.string(),
        maturity: z.enum(["experimental", "beta", "stable", "deprecated"]),
      })
    )
    .min(1),
});

const renderFeatureCatalog = (
  schema: z.infer<typeof featureCatalogSchema>
): string =>
  schema.features
    .map(
      (f) =>
        `### ${f.name} (${f.maturity})\n${f.description}\n\n**User benefit:** ${f.userBenefit}`
    )
    .join("\n\n");

export const produceFeatureCatalog = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "feature_catalog")) {
      return null;
    }
    if (!context.codebaseDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: featureCatalogSchema,
      systemPrompt: `You are a senior CTO enumerating the concrete user-facing features visible in the codebase. Only list features that have actual surface area today — no roadmap items. ${PRE_ANSWER}`,
      prompt: `Codebase understanding:\n${context.codebaseDoc.content}\n\nProduce a typed feature catalog with maturity levels.`,
      temperature: 0,
    });

    assertNonEmpty("feature_catalog", {
      features: result.features.map((f) => f.name),
    });

    const summary = `${result.features.length} features cataloged`;

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.upsertChainKnowledgeDoc,
      {
        organizationId: args.organizationId,
        docType: "feature_catalog",
        ownerAgent: "cto",
        title: result.title,
        contentFull: renderFeatureCatalog(result),
        contentSummary: summary,
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: `Produced feature_catalog with ${result.features.length} features`,
    });
    return null;
  },
});

// ============================================
// PRODUCER: scope (CTO)
// ============================================

const scopeSchema = z.object({
  title: z.string(),
  currentScope: z.string(),
  outOfScope: z.string(),
  boundaries: z.array(z.string()).min(1),
});

const renderScope = (schema: z.infer<typeof scopeSchema>): string =>
  [
    `## Current Scope\n${schema.currentScope}`,
    `## Out of Scope\n${schema.outOfScope}`,
    `## Boundaries\n${schema.boundaries.map((b) => `- ${b}`).join("\n")}`,
  ].join("\n\n");

export const produceScope = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.autopilot.agents.chain_producers.getChainContext,
      { organizationId: args.organizationId }
    );

    if (!isNodeReadyToProduce(context.chainState, "scope")) {
      return null;
    }
    if (!context.codebaseDoc) {
      return null;
    }

    const result = await generateObjectWithFallback({
      models: QUALITY_MODELS,
      schema: scopeSchema,
      systemPrompt: `You are a senior CTO defining what the product is — and explicitly is NOT. Strong boundaries help downstream agents refuse irrelevant work. ${PRE_ANSWER}`,
      prompt: `Codebase understanding:\n${context.codebaseDoc.content}\n\nProduce a structured scope (current scope, out of scope, hard boundaries).`,
      temperature: 0,
    });

    assertNonEmpty("scope", {
      currentScope: result.currentScope,
      outOfScope: result.outOfScope,
      boundaries: result.boundaries,
    });

    await ctx.runMutation(
      internal.autopilot.agents.chain_producers.upsertChainKnowledgeDoc,
      {
        organizationId: args.organizationId,
        docType: "scope",
        ownerAgent: "cto",
        title: result.title,
        contentFull: renderScope(result),
        contentSummary: result.currentScope.slice(0, 200),
      }
    );

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      agent: "cto",
      level: "success",
      message: "Produced scope (knowledge doc)",
    });
    return null;
  },
});

// ============================================
// SHARED: typed-knowledge prompt context
// ============================================
// Downstream producers (market_analysis, target_definition, use_cases) used to
// read a single synthesized `app_description` doc. They now read the four typed
// knowledge docs directly so each producer can lean on the dimension(s) it
// cares about most (e.g. brand_voice for content; feature_catalog for use
// cases). This helper renders the relevant subset as a stable prompt block.

const renderTypedKnowledgeContext = (parts: {
  identity?: string | null;
  brandVoice?: string | null;
  featureCatalog?: string | null;
  scope?: string | null;
}): string => {
  const sections: string[] = [];
  if (parts.identity) {
    sections.push(`## Identity\n${parts.identity}`);
  }
  if (parts.brandVoice) {
    sections.push(`## Brand Voice\n${parts.brandVoice}`);
  }
  if (parts.featureCatalog) {
    sections.push(`## Feature Catalog\n${parts.featureCatalog}`);
  }
  if (parts.scope) {
    sections.push(`## Scope\n${parts.scope}`);
  }
  return sections.join("\n\n");
};

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
    const { identityDoc, brandVoiceDoc, featureCatalogDoc, scopeDoc } = context;
    if (!(identityDoc && brandVoiceDoc && featureCatalogDoc && scopeDoc)) {
      return null;
    }

    const knowledgeContext = renderTypedKnowledgeContext({
      identity: identityDoc.contentFull,
      brandVoice: brandVoiceDoc.contentFull,
      featureCatalog: featureCatalogDoc.contentFull,
      scope: scopeDoc.contentFull,
    });

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: marketAnalysisSchema,
      systemPrompt: `You are a Growth specialist producing a structured market analysis from the published product knowledge. Use only the inputs provided — do not invent competitors. ${PRE_ANSWER}`,
      prompt: `${knowledgeContext}\n\nProduce a market_analysis.`,
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
        dependsOnDocIds: [],
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
    if (!(context.identityDoc && context.scopeDoc && context.marketDoc)) {
      return null;
    }

    const knowledgeContext = renderTypedKnowledgeContext({
      identity: context.identityDoc.contentFull,
      scope: context.scopeDoc.contentFull,
    });

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: targetDefinitionSchema,
      systemPrompt: `You are a senior PM producing a strict target_definition. Be sharp about who we DO NOT serve — the scope's out-of-scope section is your strongest signal. ${PRE_ANSWER}`,
      prompt: `${knowledgeContext}\n\nMarket analysis:\n${context.marketDoc.content}`,
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
        dependsOnDocIds: [context.marketDoc._id],
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

    const personas: Doc<"autopilotPersonas">[] = context.personas;
    const personasForPrompt = personas.map((p) => ({
      _id: p._id,
      name: p.name,
      painPoints: p.painPoints,
      goals: p.goals,
    }));

    const knowledgeContext = renderTypedKnowledgeContext({
      identity: context.identityDoc?.contentFull,
      featureCatalog: context.featureCatalogDoc?.contentFull,
    });

    const result = await generateObjectWithFallback({
      models: FAST_MODELS,
      schema: useCasesSchema,
      systemPrompt: `You are a senior PM enumerating concrete use cases. One use case per (persona × pain) combination. Trigger scenarios must be specific and grounded in the feature catalog. ${PRE_ANSWER}`,
      prompt: `Personas:\n${JSON.stringify(personasForPrompt, null, 2)}\n\n${knowledgeContext}`,
      temperature: 0,
    });

    const personaIdByName = new Map(personas.map((p) => [p.name, p._id]));

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
