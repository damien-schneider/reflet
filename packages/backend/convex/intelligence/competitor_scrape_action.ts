import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  buildUrlEntries,
  EXTRACTION_MODELS,
  extractSection,
  type FeatureExtractionResponse,
  featureExtractionSchema,
  fetchAndExtract,
  PROFILE_MODEL,
  type ProfileResponse,
  profileSchema,
  type UrlEntry,
} from "./competitor_scrape";
import { generateStructured } from "./structured_output";

/**
 * Scrape all URLs and return content map with stats
 */
const scrapeAllUrls = async (
  urlEntries: UrlEntry[]
): Promise<{
  scrapedContent: Record<string, string>;
  processed: number;
  errors: number;
  errorMessages: string[];
}> => {
  const scrapedContent: Record<string, string> = {};
  let processed = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const entry of urlEntries) {
    try {
      const { content } = await fetchAndExtract(entry.url);
      scrapedContent[entry.key] = content;
      processed++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Fetch failed";
      errorMessages.push(`${entry.key} (${entry.url}): ${message}`);
      errors++;
    }
  }

  return { errorMessages, errors, processed, scrapedContent };
};

/**
 * Main entry point: scrape a competitor's URLs, detect changes, and generate AI profiles
 */
export const scrapeCompetitor = internalAction({
  args: { competitorId: v.id("competitors") },
  handler: async (ctx, args) => {
    const competitor = await ctx.runQuery(
      internal.intelligence.competitor_monitor.getCompetitor,
      { competitorId: args.competitorId }
    );

    if (!competitor) {
      throw new Error("Competitor not found");
    }

    const jobId = await ctx.runMutation(
      internal.intelligence.competitor_monitor.createJob,
      { organizationId: competitor.organizationId, type: "competitor_scrape" }
    );

    await ctx.runMutation(internal.intelligence.competitor_monitor.updateJob, {
      jobId,
      status: "processing",
    });

    const urlEntries = buildUrlEntries(competitor);
    const {
      scrapedContent,
      processed,
      errors: scrapeErrors,
      errorMessages,
    } = await scrapeAllUrls(urlEntries);
    let totalErrors = scrapeErrors;

    const combinedContent = Object.entries(scrapedContent)
      .map(([key, content]) => `[${key}]\n${content}`)
      .join("\n\n");

    // Detect changes and create signals for each changed section
    const previousContent = competitor.lastScrapedContent ?? "";
    if (combinedContent !== previousContent && previousContent.length > 0) {
      await detectAndSignalChanges(
        ctx,
        urlEntries,
        scrapedContent,
        previousContent,
        competitor,
        jobId
      );
    }

    // Generate AI profile and extract features
    const {
      aiProfile,
      aiProfileUpdatedAt,
      featureList,
      errors: aiErrors,
    } = await generateAiData(competitor.name, scrapedContent);
    totalErrors += aiErrors;

    await ctx.runMutation(
      internal.intelligence.competitor_monitor.updateCompetitorAfterScrape,
      {
        aiProfile,
        aiProfileUpdatedAt,
        competitorId: args.competitorId,
        featureList,
        lastScrapedAt: Date.now(),
        lastScrapedContent: combinedContent || undefined,
      }
    );

    await ctx.runMutation(internal.intelligence.competitor_monitor.updateJob, {
      errorMessage:
        errorMessages.length > 0 ? errorMessages.join(" | ") : undefined,
      jobId,
      stats: {
        errors: totalErrors,
        itemsFound: urlEntries.length,
        itemsProcessed: processed,
      },
      status: totalErrors === urlEntries.length ? "failed" : "completed",
    });
  },
});

/**
 * Detect changes per URL section and create signals
 */
const detectAndSignalChanges = async (
  ctx: ActionCtx,
  urlEntries: UrlEntry[],
  scrapedContent: Record<string, string>,
  previousContent: string,
  competitor: {
    organizationId: Id<"organizations">;
    _id: Id<"competitors">;
    name: string;
  },
  jobId: Id<"intelligenceJobs">
) => {
  for (const entry of urlEntries) {
    const content = scrapedContent[entry.key];
    if (!content) {
      continue;
    }

    const previousSection = extractSection(previousContent, entry.key);
    if (content === previousSection) {
      continue;
    }

    const signalType =
      entry.source === "competitor_pricing"
        ? "pricing_change"
        : "competitor_update";

    await ctx.runMutation(
      internal.intelligence.competitor_monitor.createSignal,
      {
        competitorId: competitor._id,
        content: content.slice(0, 1000),
        jobId,
        organizationId: competitor.organizationId,
        relevanceScore: 0.7,
        sentiment: "neutral",
        signalType,
        source: entry.source,
        title: `${competitor.name} ${entry.key} change detected`,
        url: entry.url,
      }
    );
  }
};

/**
 * Generate AI SWOT profile and extract features from scraped content
 */
const generateAiData = async (
  competitorName: string,
  scrapedContent: Record<string, string>
): Promise<{
  aiProfile?: string;
  aiProfileUpdatedAt?: number;
  featureList?: string[];
  errors: number;
}> => {
  let aiProfile: string | undefined;
  let aiProfileUpdatedAt: number | undefined;
  let featureList: string[] | undefined;
  let errors = 0;

  if (Object.keys(scrapedContent).length > 0) {
    try {
      const profile = await generateSwotProfile(competitorName, scrapedContent);
      aiProfile = JSON.stringify(profile);
      aiProfileUpdatedAt = Date.now();
    } catch {
      errors++;
    }
  }

  const featuresContent = scrapedContent.features || scrapedContent.website;
  if (featuresContent) {
    try {
      featureList = await extractFeatures(competitorName, featuresContent);
    } catch {
      errors++;
    }
  }

  return { aiProfile, aiProfileUpdatedAt, errors, featureList };
};

/**
 * Generate a SWOT profile for a competitor using AI
 */
const generateSwotProfile = async (
  competitorName: string,
  scrapedContent: Record<string, string>
): Promise<ProfileResponse> => {
  const contentSummary = Object.entries(scrapedContent)
    .map(([key, content]) => `## ${key}\n${content}`)
    .join("\n\n");

  return await generateStructured({
    model: PROFILE_MODEL,
    prompt: `Analyze this competitor and generate a SWOT profile:\n\nCOMPETITOR: ${competitorName}\n\nSCRAPED CONTENT:\n${contentSummary}\n\nProvide a concise summary, and list specific strengths, weaknesses, opportunities, and threats based on the content.`,
    schema: profileSchema,
    system:
      'You are a competitive intelligence analyst. Analyze the provided competitor website content and generate a SWOT analysis profile. Be specific and actionable in your analysis.\n\nRespond with ONLY valid JSON matching this exact format:\n{\n  "summary": "string",\n  "strengths": ["string"],\n  "weaknesses": ["string"],\n  "opportunities": ["string"],\n  "threats": ["string"]\n}',
  });
};

/**
 * Extract product features from page content using AI with model fallback
 */
const extractFeatures = async (
  competitorName: string,
  content: string
): Promise<string[]> => {
  let result: FeatureExtractionResponse | null = null;
  let lastError: Error | null = null;

  for (const modelId of EXTRACTION_MODELS) {
    try {
      result = await generateStructured({
        model: modelId,
        prompt: `Extract the product features for "${competitorName}" from this page content:\n\n${content}\n\nList each distinct product feature mentioned or implied on this page.`,
        schema: featureExtractionSchema,
        system:
          'You are a product analyst. Extract a list of product features from the provided website content. Focus on concrete, distinct features.\n\nRespond with ONLY valid JSON: { "features": ["feature1", "feature2", ...] }',
      });
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!result) {
    throw new Error(
      `All extraction models failed: ${lastError?.message ?? "Unknown error"}`
    );
  }

  return result.features;
};
