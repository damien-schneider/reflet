import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  MAX_FINDINGS_PER_QUERY,
  MIN_RELEVANCE_SCORE,
  type SignalOutput,
} from "./agent_model";

/**
 * Build a community search prompt from keywords and competitor context
 */
export const buildCommunityPrompt = (
  keywords: Array<{ keyword: string; subreddit?: string; source: string }>,
  competitorNames: string[]
): string => {
  const keywordList = keywords
    .map((kw) => {
      const subredditHint = kw.subreddit ? ` (check r/${kw.subreddit})` : "";
      return `- "${kw.keyword}"${subredditHint}`;
    })
    .join("\n");

  const competitorContext =
    competitorNames.length > 0
      ? `\nKnown competitors for context: ${competitorNames.join(", ")}`
      : "";

  return `Search the web for recent community discussions about the following keywords. Focus on Reddit, Hacker News, forums, and discussion threads from the past week.

KEYWORDS:
${keywordList}
${competitorContext}

For each keyword, find discussions where people express:
- Pain points with existing tools in this space
- Feature requests or wishlists
- Complaints or frustrations
- Comparisons between competing products
- Emerging trends or shifts in the market

Return up to ${MAX_FINDINGS_PER_QUERY} of the most relevant and actionable findings. Each finding should include the source URL when possible. Focus on quality over quantity — skip low-value results.`;
};

/**
 * Build a competitor research prompt for a specific competitor
 */
export const buildCompetitorPrompt = (competitor: {
  name: string;
  websiteUrl: string;
  changelogUrl?: string;
  pricingUrl?: string;
  featuresUrl?: string;
  description?: string;
}): string => {
  const urls = [
    `Website: ${competitor.websiteUrl}`,
    competitor.changelogUrl ? `Changelog: ${competitor.changelogUrl}` : null,
    competitor.pricingUrl ? `Pricing: ${competitor.pricingUrl}` : null,
    competitor.featuresUrl ? `Features: ${competitor.featuresUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const descriptionContext = competitor.description
    ? `\nDescription: ${competitor.description}`
    : "";

  return `Search the web for recent updates, pricing changes, new features, and market moves by "${competitor.name}".
${descriptionContext}

Known URLs:
${urls}

Look for:
1. Recent product announcements or feature launches
2. Pricing changes or new plan tiers
3. Blog posts about strategy or roadmap
4. Community reactions to their recent changes
5. Reviews or comparisons mentioning them
6. Any notable partnerships, funding, or acquisitions

Return up to ${MAX_FINDINGS_PER_QUERY} of the most relevant findings. Focus on recent, actionable intelligence.`;
};

/**
 * Store valid findings as intelligence signals
 */
export const storeFindings = async (
  ctx: ActionCtx,
  findings: SignalOutput["findings"],
  organizationId: Id<"organizations">,
  jobId: Id<"intelligenceJobs">,
  competitorId?: Id<"competitors">
): Promise<{ stored: number; skipped: number }> => {
  let stored = 0;
  let skipped = 0;

  for (const finding of findings) {
    if (finding.relevanceScore < MIN_RELEVANCE_SCORE) {
      console.log(
        `[intelligence] Skipping finding "${finding.title}" — relevance ${finding.relevanceScore} < ${MIN_RELEVANCE_SCORE}`
      );
      skipped++;
      continue;
    }

    try {
      await ctx.runMutation(
        internal.intelligence.competitor_monitor.createSignal,
        {
          competitorId,
          content: finding.content.slice(0, 1000),
          jobId,
          organizationId,
          relevanceScore: finding.relevanceScore,
          sentiment: finding.sentiment,
          signalType: finding.signalType,
          source: finding.source,
          title: finding.title,
          url: finding.url,
        }
      );
      console.log(
        `[intelligence] Stored signal: "${finding.title}" (${finding.signalType}, relevance: ${finding.relevanceScore})`
      );
      stored++;
    } catch (error) {
      console.error(
        `[intelligence] Failed to store finding "${finding.title}":`,
        error instanceof Error ? error.message : error
      );
      skipped++;
    }
  }

  return { skipped, stored };
};
