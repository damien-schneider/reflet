import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalQuery,
} from "../_generated/server";
import { generateStructured } from "./structured_output";

// OpenRouter provider setup
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use :online variant — OpenRouter adds web search via Exa.ai automatically
const SEARCH_MODEL = "anthropic/claude-sonnet-4:online";

// Regular model for structured extraction (no :online — tool use works reliably)
const EXTRACTION_MODEL = "anthropic/claude-sonnet-4";

// Minimum relevance score to store a signal
const MIN_RELEVANCE_SCORE = 0.4;

// Maximum findings per query to keep costs manageable
const MAX_FINDINGS_PER_QUERY = 10;

// Shared output schema for AI-extracted signals
const signalOutputSchema = z.object({
  findings: z.array(
    z.object({
      title: z.string(),
      content: z.string().describe("Summary of the finding"),
      url: z.string().optional().describe("Source URL if found"),
      signalType: z.enum([
        "pain_point",
        "feature_request",
        "competitor_update",
        "pricing_change",
        "market_trend",
        "feature_gap",
      ]),
      relevanceScore: z.number().min(0).max(1),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      source: z
        .enum(["reddit", "hackernews", "web"])
        .describe("Best guess of where this info came from"),
    })
  ),
});

type SignalOutput = z.infer<typeof signalOutputSchema>;

/**
 * Extract structured findings from raw search text.
 */
const extractFindings = async (
  rawText: string,
  context: string
): Promise<SignalOutput> =>
  generateStructured({
    model: EXTRACTION_MODEL,
    schema: signalOutputSchema,
    system: `You are a data extraction specialist. Extract structured intelligence findings from the provided web search results.

For each finding, classify it as one of: pain_point, feature_request, competitor_update, pricing_change, market_trend, feature_gap.
Rate relevance from 0-1 and sentiment as positive/negative/neutral.
Only include findings that are clearly present in the search results. Do not fabricate information.

Respond with ONLY valid JSON matching this exact format:
{
  "findings": [
    {
      "title": "string",
      "content": "Summary of the finding",
      "url": "Source URL if found (optional)",
      "signalType": "pain_point|feature_request|competitor_update|pricing_change|market_trend|feature_gap",
      "relevanceScore": 0.0-1.0,
      "sentiment": "positive|negative|neutral",
      "source": "reddit|hackernews|web"
    }
  ]
}`,
    prompt: `${context}\n\n${rawText}`,
  });

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get all keywords for an organization
 */
export const getKeywords = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const keywords = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return keywords;
  },
});

/**
 * Get active competitors with their URLs for an organization
 */
export const getCompetitors = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const competitors = await ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    return competitors;
  },
});

// ============================================
// HELPERS
// ============================================

/**
 * Build a community search prompt from keywords and competitor context
 */
const buildCommunityPrompt = (
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
const buildCompetitorPrompt = (competitor: {
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
const storeFindings = async (
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
          organizationId,
          jobId,
          source: finding.source,
          competitorId,
          title: finding.title,
          content: finding.content.slice(0, 1000),
          url: finding.url,
          signalType: finding.signalType,
          relevanceScore: finding.relevanceScore,
          sentiment: finding.sentiment,
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

  return { stored, skipped };
};

// ============================================
// ACTIONS
// ============================================

/**
 * Main entry point for community listening.
 * Uses the :online model variant to search Reddit, HN, and forums for each keyword.
 */
export const runCommunitySearch = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const keywords = await ctx.runQuery(
      internal.intelligence.intelligence_agent.getKeywords,
      { organizationId: args.organizationId }
    );

    if (keywords.length === 0) {
      return;
    }

    const competitors = await ctx.runQuery(
      internal.intelligence.intelligence_agent.getCompetitors,
      { organizationId: args.organizationId }
    );

    const competitorNames = competitors.map((c: { name: string }) => c.name);

    const jobId = await ctx.runMutation(
      internal.intelligence.competitor_monitor.createJob,
      { organizationId: args.organizationId, type: "reddit_scan" }
    );

    await ctx.runMutation(internal.intelligence.competitor_monitor.updateJob, {
      jobId,
      status: "processing",
    });

    let itemsFound = 0;
    let itemsProcessed = 0;
    let errors = 0;

    let errorMessage: string | undefined;

    try {
      const prompt = buildCommunityPrompt(keywords, competitorNames);
      console.log(
        `[intelligence] Community search starting for ${keywords.length} keywords`
      );

      // Step 1: Use :online model to search the web and get raw results
      const searchResponse = await generateText({
        model: openrouter(SEARCH_MODEL),
        system: `You are a competitive intelligence analyst. Search the web for community discussions about pain points, feature requests, and market trends in the user's product space. Focus on Reddit, Hacker News, forums, and discussion threads from the past week. Be thorough and include source URLs when found. Return detailed findings as prose.`,
        prompt,
      });

      const rawSearchResults = searchResponse.text;
      console.log(
        `[intelligence] Web search returned ${rawSearchResults.length} chars`
      );

      if (!rawSearchResults || rawSearchResults.trim().length === 0) {
        throw new Error("Web search returned empty results");
      }

      // Step 2: Use regular model to extract structured data from search results
      const response = await extractFindings(
        rawSearchResults,
        "Extract structured findings from these web search results:"
      );

      const findings = response.findings;
      itemsFound = findings.length;
      console.log(
        `[intelligence] Extraction produced ${findings.length} findings`
      );

      const { stored, skipped } = await storeFindings(
        ctx,
        findings,
        args.organizationId,
        jobId
      );

      itemsProcessed = stored;
      errors = skipped;
      console.log(
        `[intelligence] Community search done: ${stored} stored, ${skipped} skipped`
      );
    } catch (error: unknown) {
      errorMessage =
        error instanceof Error ? error.message : "AI request failed";
      console.error(`[intelligence] Community search failed: ${errorMessage}`);
      errors++;
    } finally {
      const allFailed = itemsProcessed === 0 && errors > 0;

      await ctx.runMutation(
        internal.intelligence.competitor_monitor.updateJob,
        {
          jobId,
          status: allFailed ? "failed" : "completed",
          errorMessage,
          stats: {
            itemsFound,
            itemsProcessed,
            errors,
          },
        }
      );
    }

    // Propagate failure to the pipeline so it's counted as an error
    if (itemsProcessed === 0 && errors > 0) {
      throw new Error(errorMessage ?? "Community search produced no results");
    }
  },
});

/**
 * Research competitors for recent updates, pricing changes, and new features.
 * Uses the :online model variant to search the web for each competitor.
 */
export const runCompetitorResearch = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const competitors = await ctx.runQuery(
      internal.intelligence.intelligence_agent.getCompetitors,
      { organizationId: args.organizationId }
    );

    if (competitors.length === 0) {
      return;
    }

    const jobId = await ctx.runMutation(
      internal.intelligence.competitor_monitor.createJob,
      { organizationId: args.organizationId, type: "web_search" }
    );

    await ctx.runMutation(internal.intelligence.competitor_monitor.updateJob, {
      jobId,
      status: "processing",
    });

    let itemsFound = 0;
    let itemsProcessed = 0;
    let errors = 0;
    const competitorErrors: string[] = [];

    for (const competitor of competitors) {
      try {
        const prompt = buildCompetitorPrompt(competitor);
        console.log(
          `[intelligence] Researching competitor: ${competitor.name}`
        );

        // Step 1: Use :online model to search the web for competitor intel
        const searchResponse = await generateText({
          model: openrouter(SEARCH_MODEL),
          system:
            "You are a competitive intelligence analyst monitoring competitor activity. Search for recent updates, pricing changes, new features, and market moves from the specified competitor. Be thorough and include source URLs when found.",
          prompt,
        });

        const rawSearchResults = searchResponse.text;
        console.log(
          `[intelligence] Competitor "${competitor.name}" search: ${rawSearchResults.length} chars`
        );

        if (!rawSearchResults || rawSearchResults.trim().length === 0) {
          competitorErrors.push(
            `${competitor.name}: Web search returned empty results`
          );
          errors++;
          continue;
        }

        // Step 2: Use regular model to extract structured data
        const response = await extractFindings(
          rawSearchResults,
          `Extract structured findings about "${competitor.name}" from these web search results:`
        );

        const findings = response.findings;
        itemsFound += findings.length;
        console.log(
          `[intelligence] Competitor "${competitor.name}" extraction: ${findings.length} findings`
        );

        const { stored, skipped } = await storeFindings(
          ctx,
          findings,
          args.organizationId,
          jobId,
          competitor._id
        );

        itemsProcessed += stored;
        errors += skipped;
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "AI request failed";
        console.error(
          `[intelligence] Competitor "${competitor.name}" failed: ${msg}`
        );
        competitorErrors.push(`${competitor.name}: ${msg}`);
        errors++;
      }
    }

    const allFailed =
      itemsProcessed === 0 && errors > 0 && competitors.length > 0;

    console.log(
      `[intelligence] Competitor research done: ${itemsProcessed} stored, ${errors} errors`
    );

    await ctx.runMutation(internal.intelligence.competitor_monitor.updateJob, {
      jobId,
      status: allFailed ? "failed" : "completed",
      errorMessage:
        competitorErrors.length > 0 ? competitorErrors.join(" | ") : undefined,
      stats: {
        itemsFound,
        itemsProcessed,
        errors,
      },
    });

    // Propagate failure to the pipeline so it's counted as an error
    if (allFailed) {
      throw new Error(competitorErrors.join(" | "));
    }
  },
});
