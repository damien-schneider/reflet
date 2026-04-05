/**
 * Company Brief — seeds the product_definition knowledge doc from repo analysis.
 *
 * When a user connects a repo, this analyzes the available data and
 * bootstraps the product definition as a starting point for manual editing.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { MODELS } from "./agents/models";
import { generateObjectWithFallback } from "./agents/shared";

const BRIEF_MODELS = [MODELS.SMART, MODELS.FAST] as const;

const briefSchema = z.object({
  title: z.string(),
  contentFull: z.string(),
  contentSummary: z.string(),
});

const BRIEF_SYSTEM_PROMPT = `You are a senior product strategist bootstrapping a product definition for a software company.

Given a detailed product analysis, generate a concise product definition:
- What the product is, who it's for, and the core value proposition
- Key features and differentiators grounded in what the product actually does for users
- Target audience and use cases based on observed product functionality

Rules:
- Be specific and grounded in the actual product analysis, not generic
- contentSummary should be a concise 1-2 sentence overview of the product's value
- contentFull should be 200-500 words describing the product from a user perspective
- Emphasize user-facing features and value, not technical implementation
- If data is sparse, make reasonable inferences and flag assumptions`;

/**
 * Generate the product definition from repo analysis — seeds the knowledge doc.
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

    const repoContext = repoAnalysis?.productAnalysis
      ? [
          `Product Analysis:\n${repoAnalysis.productAnalysis}`,
          repoUrl && `Repository: ${repoUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          repoAnalysis?.summary && `Summary: ${repoAnalysis.summary}`,
          repoAnalysis?.techStack && `Tech Stack: ${repoAnalysis.techStack}`,
          repoAnalysis?.architecture &&
            `Architecture: ${repoAnalysis.architecture}`,
          repoAnalysis?.features && `Features: ${repoAnalysis.features}`,
          repoAnalysis?.repoStructure &&
            `Structure: ${repoAnalysis.repoStructure}`,
          repoUrl && `Repository: ${repoUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n");

    const prompt = repoContext
      ? `Analyze this repository and generate a product definition:\n\n${repoContext}`
      : "Generate a product definition for a software product. Use placeholder content and flag that real data is needed.";

    const brief = await generateObjectWithFallback({
      models: BRIEF_MODELS,
      schema: briefSchema,
      prompt,
      systemPrompt: BRIEF_SYSTEM_PROMPT,
    });

    await ctx.runMutation(internal.autopilot.knowledge.createKnowledgeDoc, {
      organizationId: args.organizationId,
      docType: "product_definition",
      ownerAgent: "pm",
      title: brief.title,
      contentFull: brief.contentFull,
      contentSummary: brief.contentSummary,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message:
        "Product definition generated — review and edit it in the Product tab",
    });
  },
});

/**
 * Check if the product definition exists.
 */
export const isCompanyBriefApproved = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("docType", "product_definition")
      )
      .unique();

    return doc !== null;
  },
});
