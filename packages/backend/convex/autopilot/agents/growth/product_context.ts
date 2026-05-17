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
  /** Long-form markdown description rendered from the typed product profile. */
  productDescription: string;
  /** Human-readable product name. */
  productName: string;
  /** 1-2 sentence summary for use in compact prompts. */
  productSummary: string;
}

export const MISSING_PRODUCT_DEF_MESSAGE =
  "Growth agent skipped — no product profile found in the Knowledge Base. " +
  "Run the onboarding or wait for the CTO to publish product_profile so Growth knows what the product is.";

/**
 * Load product context for Growth from the typed product profile. Growth
 * grounds on these atomic fields rather than parsing a markdown blob.
 *
 * Returns null if no product profile exists — callers must bail early.
 */
export const loadProductContext = async (
  ctx: { runQuery: ActionCtx["runQuery"] },
  organizationId: Id<"organizations">
): Promise<ProductContext | null> => {
  const profile = await ctx.runQuery(
    internal.autopilot.queries.productProfile.getProductProfileInternal,
    { organizationId }
  );

  if (!profile) {
    return null;
  }

  const agentKnowledge = await ctx.runQuery(
    internal.autopilot.agent_context.loadAgentContext,
    { organizationId, agent: "growth" }
  );

  const description = [
    `# ${profile.productName}`,
    `**Tagline:** ${profile.tagline}`,
    `**One-liner:** ${profile.oneLiner}`,
    profile.category ? `**Category:** ${profile.category}` : null,
    `**Value proposition:** ${profile.valueProposition}`,
    `**Differentiators:** ${profile.differentiators.join("; ")}`,
    `**Primary user verbs:** ${profile.primaryUserVerbs.join(", ")}`,
    `**Target audience tags:** ${profile.targetAudienceTags.join(", ")}`,
    profile.pricingModel ? `**Pricing model:** ${profile.pricingModel}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");

  return {
    productName: profile.productName,
    productDescription: description,
    productSummary: profile.oneLiner,
    agentKnowledge,
  };
};
