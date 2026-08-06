import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import {
  extractFindings,
  generateTextWithFallback,
  SEARCH_MODELS,
} from "./agent_model";
import {
  buildCommunityPrompt,
  buildCompetitorPrompt,
  storeFindings,
} from "./agent_prompts";

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
      const searchResponse = await generateTextWithFallback(SEARCH_MODELS, {
        prompt,
        system: `You are a competitive intelligence analyst. Search the web for community discussions about pain points, feature requests, and market trends in the user's product space. Focus on Reddit, Hacker News, forums, and discussion threads from the past week. Be thorough and include source URLs when found. Return detailed findings as prose.`,
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
          errorMessage,
          jobId,
          stats: {
            errors,
            itemsFound,
            itemsProcessed,
          },
          status: allFailed ? "failed" : "completed",
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
        const searchResponse = await generateTextWithFallback(SEARCH_MODELS, {
          prompt,
          system:
            "You are a competitive intelligence analyst monitoring competitor activity. Search for recent updates, pricing changes, new features, and market moves from the specified competitor. Be thorough and include source URLs when found.",
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
      errorMessage:
        competitorErrors.length > 0 ? competitorErrors.join(" | ") : undefined,
      jobId,
      stats: {
        errors,
        itemsFound,
        itemsProcessed,
      },
      status: allFailed ? "failed" : "completed",
    });

    // Propagate failure to the pipeline so it's counted as an error
    if (allFailed) {
      throw new Error(competitorErrors.join(" | "));
    }
  },
});
