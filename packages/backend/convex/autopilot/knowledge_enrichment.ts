/**
 * Knowledge Auto-Enrichment — extracts key findings from role-skill outputs
 * and updates the knowledge base to keep it fresh and accurate.
 *
 * Scheduled after role-skill runs to distill useful information into
 * persistent knowledge docs without manual president intervention.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const ENRICHMENT_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DOCS_PER_ENRICHMENT = 10;

// ============================================
// QUERIES
// ============================================

export const getRecentInsights = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      type: v.string(),
      title: v.string(),
      keyFindings: v.array(v.string()),
      sourceRole: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - ENRICHMENT_LOOKBACK_MS;

    const recentDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return recentDocs
      .filter(
        (d) =>
          d.createdAt > cutoff &&
          d.keyFindings &&
          d.keyFindings.length > 0 &&
          (d.status === "published" || d.status === "pending_review")
      )
      .slice(0, MAX_DOCS_PER_ENRICHMENT)
      .map((d) => ({
        type: d.type,
        title: d.title,
        keyFindings: d.keyFindings ?? [],
        sourceRole: d.sourceRole ?? undefined,
      }));
  },
});

// ============================================
// ACTIONS
// ============================================

export const enrichKnowledgeBase = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const insights = await ctx.runQuery(
      internal.autopilot.knowledge_enrichment.getRecentInsights,
      { organizationId: args.organizationId }
    );

    if (insights.length === 0) {
      return null;
    }

    // Group findings by relevant knowledge doc type. Product-side enrichment
    // now flows into the typed product profile via dedicated mutations, so the
    // legacy markdown append path only covers `target_audience`.
    const targetAudienceFindings: string[] = [];

    for (const insight of insights) {
      const isMarketResearch =
        insight.type === "market_research" ||
        insight.type === "battlecard" ||
        insight.type === "prospect_brief";

      if (isMarketResearch) {
        for (const finding of insight.keyFindings) {
          targetAudienceFindings.push(finding);
        }
      }
    }

    if (targetAudienceFindings.length > 0) {
      await appendToKnowledgeDoc(
        ctx,
        args.organizationId,
        "target_audience",
        targetAudienceFindings
      );
    }

    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: args.organizationId,
      role: "system",
      level: "info",
      message: `Knowledge enriched with ${targetAudienceFindings.length} findings from ${insights.length} recent documents`,
    });

    return null;
  },
});

type KnowledgeDocType =
  | "feature_catalog"
  | "scope"
  | "roadmap"
  | "brand_voice"
  | "team_processes"
  | "target_audience";

async function appendToKnowledgeDoc(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  docType: KnowledgeDocType,
  newFindings: string[]
): Promise<void> {
  const existing = await ctx.runQuery(
    internal.autopilot.knowledge.getKnowledgeDocByType,
    {
      organizationId,
      docType,
    }
  );

  if (!existing) {
    return;
  }

  const findingsBlock = newFindings.map((f) => `- ${f}`).join("\n");

  const updatedContent = `${existing.contentFull}\n\n## Auto-Enriched Findings (${new Date().toISOString().split("T")[0]})\n${findingsBlock}`;
  const updatedSummary = `${existing.contentSummary} | +${newFindings.length} new findings`;

  await ctx.runMutation(internal.autopilot.knowledge.updateKnowledgeDoc, {
    docId: existing._id,
    contentFull: updatedContent,
    contentSummary: updatedSummary,
    editedBy: "role_skill",
    editingRole: "system",
  });
}
