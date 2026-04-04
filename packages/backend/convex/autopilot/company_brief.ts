/**
 * Company Brief — generates 7 knowledge docs from repo analysis via LLM.
 *
 * When a user connects a repo, this analyzes the available data and
 * bootstraps the knowledge base with Product Definition, ICP, Competitive
 * Landscape, Brand Voice, Technical Architecture, Goals/OKRs, and Roadmap.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { MODELS } from "./agents/models";
import { generateObjectWithFallback } from "./agents/shared";

const BRIEF_MODELS = [MODELS.SMART, MODELS.FAST] as const;

const KNOWLEDGE_DOC_TYPES = [
  "product_definition",
  "user_personas_icp",
  "competitive_landscape",
  "brand_voice",
  "technical_architecture",
  "goals_okrs",
  "product_roadmap",
] as const;

type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];

const briefSchema = z.object({
  docs: z.array(
    z.object({
      docType: z.enum(KNOWLEDGE_DOC_TYPES),
      title: z.string(),
      contentFull: z.string(),
      contentSummary: z.string(),
    })
  ),
});

const BRIEF_SYSTEM_PROMPT = `You are a senior product strategist bootstrapping a knowledge base for a software company.

Given repository data (tech stack, architecture, features, structure), generate exactly 7 knowledge documents:

1. **product_definition** — What the product is, who it's for, core value prop
2. **user_personas_icp** — Ideal Customer Profile + 2-3 user personas
3. **competitive_landscape** — Key competitors, differentiators, market position
4. **brand_voice** — Tone, style, key messaging themes
5. **technical_architecture** — Stack overview, patterns, key decisions
6. **goals_okrs** — 3-5 quarterly objectives with key results
7. **product_roadmap** — Near-term (this quarter), mid-term (next quarter), long-term priorities

Rules:
- Be specific and grounded in the actual repo data, not generic
- contentSummary should be a concise 1-2 sentence overview
- contentFull should be 200-500 words of actionable detail
- If data is sparse, make reasonable inferences and flag assumptions
- Use Markdown formatting in contentFull`;

/**
 * Generate the company brief — 7 knowledge docs from repo analysis.
 */
export const generateCompanyBrief = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const repoAnalysis = await ctx.runQuery(
      internal.autopilot.agents.cto.getRepoAnalysisForCto,
      { organizationId: args.organizationId }
    );

    const repoUrl = await ctx.runQuery(
      internal.autopilot.onboarding.getConnectedRepoUrl,
      { organizationId: args.organizationId }
    );

    const repoContext = [
      repoAnalysis?.summary && `Summary: ${repoAnalysis.summary}`,
      repoAnalysis?.techStack && `Tech Stack: ${repoAnalysis.techStack}`,
      repoAnalysis?.architecture &&
        `Architecture: ${repoAnalysis.architecture}`,
      repoAnalysis?.features && `Features: ${repoAnalysis.features}`,
      repoAnalysis?.repoStructure && `Structure: ${repoAnalysis.repoStructure}`,
      repoUrl && `Repository: ${repoUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = repoContext
      ? `Analyze this repository and generate 7 knowledge documents:\n\n${repoContext}`
      : "Generate 7 knowledge documents for a software product. Use placeholder content and flag that real data is needed.";

    const brief = await generateObjectWithFallback({
      models: BRIEF_MODELS,
      schema: briefSchema,
      prompt,
      systemPrompt: BRIEF_SYSTEM_PROMPT,
    });

    const ownerMap: Record<KnowledgeDocType, string> = {
      product_definition: "pm",
      user_personas_icp: "pm",
      competitive_landscape: "growth",
      brand_voice: "growth",
      technical_architecture: "architect",
      goals_okrs: "ceo",
      product_roadmap: "pm",
    };

    for (const doc of brief.docs) {
      await ctx.runMutation(internal.autopilot.knowledge.createKnowledgeDoc, {
        organizationId: args.organizationId,
        docType: doc.docType,
        ownerAgent: ownerMap[doc.docType] ?? "pm",
        title: doc.title,
        contentFull: doc.contentFull,
        contentSummary: doc.contentSummary,
      });
    }

    await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: args.organizationId,
      type: "company_brief_review",
      title: "Review Your Company Brief",
      summary:
        "Reflet has generated 7 knowledge documents about your product. Review and edit them before agents start working.",
      sourceAgent: "system",
      priority: "high",
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message: `Company brief generated: ${brief.docs.length} knowledge documents created`,
    });
  },
});

/**
 * Check if the company brief is approved — all 7 knowledge docs exist
 * and the review inbox item has been approved.
 */
export const isCompanyBriefApproved = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const expectedDocCount = KNOWLEDGE_DOC_TYPES.length;
    if (docs.length < expectedDocCount) {
      return false;
    }

    const existingTypes = new Set(docs.map((d) => d.docType));
    const allTypesPresent = KNOWLEDGE_DOC_TYPES.every((t) =>
      existingTypes.has(t)
    );

    if (!allTypesPresent) {
      return false;
    }

    const reviewItem = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("type"), "company_brief_review"))
      .order("desc")
      .first();

    if (!reviewItem) {
      return false;
    }

    return (
      reviewItem.status === "approved" || reviewItem.status === "auto_approved"
    );
  },
});
