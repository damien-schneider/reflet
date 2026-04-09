/**
 * Market gap assessment — evaluates market understanding depth
 * and creates follow-up research notes for proactive discovery.
 */

import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { assessMarketGaps } from "./discovery";
import type { ProductContext } from "./product_context";

const MAX_PENDING_FOLLOWUPS = 3;

export const runGapAssessment = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
  },
  organizationId: Id<"organizations">,
  product: ProductContext
): Promise<void> => {
  // Gather existing research for context
  const existingDocs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByOrg,
    { organizationId, type: "market_research" }
  );
  const existingResearchSummary = existingDocs
    .slice(0, 10)
    .map((d: Doc<"autopilotDocuments">) => `- ${d.title}`)
    .join("\n");

  const competitors = await ctx.runQuery(
    internal.autopilot.competitors.getCompetitorsByOrg,
    { organizationId }
  );
  const competitorNames = competitors.map(
    (c: Doc<"autopilotCompetitors">) => c.name
  );

  // Cap: don't create more follow-up notes if there are already unprocessed ones
  const existingFollowUps = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["growth-followup"], status: "draft" }
  );
  if (existingFollowUps.length >= MAX_PENDING_FOLLOWUPS) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Gap assessment skipped — ${existingFollowUps.length} unprocessed follow-up notes already pending`,
    });
    return;
  }

  // Circuit breaker: require at least 1 user-reviewed growth document
  // before creating more follow-up work (prevents self-sustaining loops)
  const reviewedDocs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["growth"], status: "published" }
  );
  if (reviewedDocs.length === 0 && existingFollowUps.length > 0) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message:
        "Gap assessment skipped — no user-reviewed growth content yet (waiting for President review before generating more work)",
    });
    return;
  }

  const gaps = await assessMarketGaps(
    product.productName,
    product.productDescription,
    existingResearchSummary,
    competitorNames
  );

  // Only write follow-up notes if there are real gaps
  if (gaps.gaps.length === 0 || gaps.marketUnderstandingScore > 85) {
    return;
  }

  // Cap new notes to stay under the limit
  const slotsAvailable = MAX_PENDING_FOLLOWUPS - existingFollowUps.length;
  const gapsToWrite = gaps.gaps.slice(0, slotsAvailable);

  for (const gap of gapsToWrite) {
    // Dedup: skip if a similar follow-up note already exists
    const existing = await ctx.runQuery(
      internal.autopilot.dedup.findSimilarGrowthItem,
      { organizationId, title: `Growth follow-up: ${gap.topic}` }
    );
    if (existing) {
      continue;
    }

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: "note",
      title: `Growth follow-up: ${gap.topic}`,
      content: `## ${gap.topic}\n\n${gap.reasoning}\n\n**Suggested searches:**\n${gap.suggestedSearchTerms.map((t) => `- ${t}`).join("\n")}`,
      tags: ["growth-followup"],
      sourceAgent: "growth",
    });
  }

  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId,
    agent: "growth",
    level: "info",
    message: `Market understanding: ${gaps.marketUnderstandingScore}/100 — created ${gapsToWrite.length} follow-up notes (${existingFollowUps.length} already pending)`,
  });
};
