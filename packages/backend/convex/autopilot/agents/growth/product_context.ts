/**
 * Product context loading — shared by all Growth agent modules.
 */

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

// ============================================
// TYPES & CONSTANTS
// ============================================

export interface ProductContext {
  agentKnowledge: string;
  /** Full product definition markdown from the knowledge base. */
  productDescription: string;
  /** Human-readable product name extracted from the knowledge base. */
  productName: string;
  /** 1-2 sentence summary for use in compact prompts. */
  productSummary: string;
}

// Regex patterns for product name extraction (top-level for performance)
export const HEADING_PATTERN = /^#{1,2}\s+(.+?)(?:\s*[-—:|]|$)/m;
export const SENTENCE_SPLIT_PATTERN = /[.!]/;
export const NAME_IS_PATTERN = /^(.+?)\s+(?:is|—|:)\s/;
export const GENERIC_HEADINGS = ["product definition", "overview"];

export const MISSING_PRODUCT_DEF_MESSAGE =
  "Growth agent skipped — no product definition found in the Knowledge Base. " +
  "Run the onboarding or manually create a product definition so Growth knows what the product is.";

// ============================================
// HELPERS
// ============================================

/**
 * Extract the product name from a knowledge doc.
 *
 * Tries (in order):
 *   1. The doc title if it's more specific than "Product Definition"
 *   2. The first H1/H2 heading in the content
 *   3. The first sentence of the summary (pattern: "X is a ...")
 */
export const extractProductName = (productDef: {
  title: string;
  contentFull: string;
  contentSummary: string;
}): string => {
  // Use doc title if it's specific (not just "Product Definition")
  const title = productDef.title.trim();
  if (title && !title.toLowerCase().includes("product definition")) {
    return title;
  }

  // Try to find the product name from the first heading
  const headingMatch = productDef.contentFull.match(HEADING_PATTERN);
  if (headingMatch?.[1]) {
    const heading = headingMatch[1].trim();
    const headingLower = heading.toLowerCase();
    // Skip generic headings
    if (
      !GENERIC_HEADINGS.some((g) => headingLower.includes(g)) &&
      heading.length < 80
    ) {
      return heading;
    }
  }

  // Try the first sentence of the summary — often "X is a ..."
  const sentences = productDef.contentSummary.split(SENTENCE_SPLIT_PATTERN);
  const firstSentence = sentences[0]?.trim();
  if (firstSentence) {
    const isAMatch = firstSentence.match(NAME_IS_PATTERN);
    if (isAMatch?.[1] && isAMatch[1].length < 60) {
      return isAMatch[1];
    }
  }

  // Last resort: use the summary itself (capped)
  return productDef.contentSummary.slice(0, 60);
};

/**
 * Load product context for Growth from the Knowledge Base.
 *
 * Growth should understand the product from the curated product definition,
 * NOT from raw codebase analysis. The repo analysis contains tech stack details
 * (React, Next.js, etc.) which Growth would incorrectly classify as competitors.
 * Tech stack data is for CTO/Dev agents only.
 *
 * Returns null if no product definition exists — callers must bail early.
 */
export const loadProductContext = async (
  ctx: { runQuery: ActionCtx["runQuery"] },
  organizationId: Id<"organizations">
): Promise<ProductContext | null> => {
  const productDef = await ctx.runQuery(
    internal.autopilot.knowledge.getKnowledgeDocByType,
    { organizationId, docType: "product_definition" }
  );

  if (!productDef) {
    return null;
  }

  const agentKnowledge = await ctx.runQuery(
    internal.autopilot.agent_context.loadAgentContext,
    { organizationId, agent: "growth" }
  );

  return {
    productName: extractProductName(productDef),
    productDescription: productDef.contentFull,
    productSummary: productDef.contentSummary,
    agentKnowledge,
  };
};
