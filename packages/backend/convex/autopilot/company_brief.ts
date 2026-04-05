/**
 * Company Brief — seeds the product_definition knowledge doc from repo analysis.
 *
 * When the product exploration completes, this takes the rich analysis and
 * stores it directly as the product definition knowledge doc.
 * If no exploration exists, falls back to LLM generation from sparse data.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { AGENT_MODELS } from "./agents/models";
import { generateObjectWithFallback } from "./agents/shared";

const SUMMARY_MAX_LENGTH = 200;

const fallbackBriefSchema = z.object({
  title: z.string(),
  contentFull: z.string(),
  contentSummary: z.string(),
});

const FALLBACK_SYSTEM_PROMPT = `You are a senior product strategist writing a product definition for a software company.

Given repository data, generate a detailed product definition in markdown:
- What the product is, who it's for, and the core value proposition
- Key features described from the user's perspective
- Target audience and use cases

Rules:
- Be specific and grounded in the actual data, not generic
- contentSummary: 1-2 sentence overview
- contentFull: detailed markdown product definition (as long as needed, be thorough)
- Focus on user-facing value, not technical implementation`;

/**
 * Generate the product definition from repo analysis — seeds the knowledge doc.
 *
 * If a rich productAnalysis exists (from the agentic exploration), use it directly.
 * Otherwise fall back to LLM generation from sparse fields.
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

    // If we have a rich product analysis from the exploration agent, use it directly
    if (repoAnalysis?.productAnalysis) {
      const analysis = repoAnalysis.productAnalysis;
      const summary = extractSummary(analysis);

      await ctx.runMutation(internal.autopilot.knowledge.createKnowledgeDoc, {
        organizationId: args.organizationId,
        docType: "product_definition",
        ownerAgent: "pm",
        title: "Product Definition",
        contentFull: analysis,
        contentSummary: summary,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message:
          "Product definition generated from deep codebase analysis — review and edit it in the Knowledge tab",
      });
      return;
    }

    // Fallback: generate from sparse repo data via LLM
    const repoContext = [
      repoAnalysis?.summary && `Summary: ${repoAnalysis.summary}`,
      repoAnalysis?.features && `Features: ${repoAnalysis.features}`,
      repoAnalysis?.repoStructure && `Structure: ${repoAnalysis.repoStructure}`,
      repoUrl && `Repository: ${repoUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = repoContext
      ? `Analyze this repository and generate a product definition:\n\n${repoContext}`
      : "Generate a product definition for a software product. Use placeholder content and flag that real data is needed.";

    const brief = await generateObjectWithFallback({
      models: AGENT_MODELS,
      schema: fallbackBriefSchema,
      prompt,
      systemPrompt: FALLBACK_SYSTEM_PROMPT,
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
        "Product definition generated — review and edit it in the Knowledge tab",
    });
  },
});

/**
 * Extract a short summary from the product analysis markdown.
 * Takes the first paragraph after any heading, or the first 200 chars.
 */
function extractSummary(analysis: string): string {
  // Try to find the first non-heading, non-empty paragraph
  const lines = analysis.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*") &&
      trimmed.length > 20
    ) {
      return trimmed.length > SUMMARY_MAX_LENGTH
        ? `${trimmed.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`
        : trimmed;
    }
  }
  // Fallback: first 200 chars
  const plain = analysis.replace(/[#*_-]/g, "").trim();
  return plain.length > SUMMARY_MAX_LENGTH
    ? `${plain.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`
    : plain;
}

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
