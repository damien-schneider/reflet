import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { generateStructured } from "./structured_output";

// Top-level regex patterns
const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
const SCRIPT_TAG_REGEX = /<script[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

// AI model configuration
const PROFILE_MODEL = "anthropic/claude-sonnet-4";
const EXTRACTION_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
  "z-ai/glm-4.7-flash",
] as const;

// Max content length per URL
const MAX_CONTENT_LENGTH = 5000;

// AI schemas
const profileSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
});

const featureExtractionSchema = z.object({
  features: z
    .array(z.string())
    .describe("List of product features detected on the page"),
});

type ProfileResponse = z.infer<typeof profileSchema>;
type FeatureExtractionResponse = z.infer<typeof featureExtractionSchema>;

// ============================================
// HELPERS
// ============================================

interface UrlEntry {
  key: string;
  source:
    | "competitor_changelog"
    | "competitor_pricing"
    | "competitor_features"
    | "web";
  url: string;
}

/**
 * Build list of URLs to scrape from a competitor record
 */
const buildUrlEntries = (competitor: {
  websiteUrl: string;
  changelogUrl?: string;
  pricingUrl?: string;
  featuresUrl?: string;
}): UrlEntry[] => {
  const entries: UrlEntry[] = [];
  if (competitor.websiteUrl) {
    entries.push({ key: "website", url: competitor.websiteUrl, source: "web" });
  }
  if (competitor.changelogUrl) {
    entries.push({
      key: "changelog",
      url: competitor.changelogUrl,
      source: "competitor_changelog",
    });
  }
  if (competitor.pricingUrl) {
    entries.push({
      key: "pricing",
      url: competitor.pricingUrl,
      source: "competitor_pricing",
    });
  }
  if (competitor.featuresUrl) {
    entries.push({
      key: "features",
      url: competitor.featuresUrl,
      source: "competitor_features",
    });
  }
  return entries;
};

/**
 * Extract a named section from combined scraped content
 */
const extractSection = (content: string, key: string): string => {
  const sectionStart = content.indexOf(`[${key}]`);
  if (sectionStart === -1) {
    return "";
  }
  const afterHeader = content.indexOf("\n", sectionStart);
  if (afterHeader === -1) {
    return "";
  }
  const nextSection = content.indexOf("\n\n[", afterHeader);
  return nextSection === -1
    ? content.slice(afterHeader + 1)
    : content.slice(afterHeader + 1, nextSection);
};

/**
 * Extract text content from HTML, stripping tags, scripts, and styles
 */
const extractTextFromHtml = (html: string): string => {
  let content = html
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(STYLE_TAG_REGEX, "")
    .replace(HTML_TAG_REGEX, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...`;
  }

  return content;
};

/**
 * Fetch a URL and return the extracted text content
 */
const fetchAndExtract = async (
  url: string
): Promise<{ content: string; title?: string }> => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const titleMatch = html.match(TITLE_REGEX);
  const title = titleMatch?.[1]?.trim() || undefined;
  const content = extractTextFromHtml(html);

  return { content, title };
};

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get competitor by ID (internal use, no auth)
 */
export const getCompetitor = internalQuery({
  args: { competitorId: v.id("competitors") },
  handler: async (ctx, args) => {
    const competitor = await ctx.db.get(args.competitorId);
    return competitor;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Update competitor with scraped data
 */
export const updateCompetitorAfterScrape = internalMutation({
  args: {
    competitorId: v.id("competitors"),
    lastScrapedContent: v.optional(v.string()),
    lastScrapedAt: v.number(),
    aiProfile: v.optional(v.string()),
    aiProfileUpdatedAt: v.optional(v.number()),
    featureList: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { competitorId, ...updates } = args;
    await ctx.db.patch(competitorId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create an intelligence signal
 */
export const createSignal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("intelligenceJobs"),
    source: v.union(
      v.literal("reddit"),
      v.literal("hackernews"),
      v.literal("web"),
      v.literal("competitor_changelog"),
      v.literal("competitor_pricing"),
      v.literal("competitor_features")
    ),
    competitorId: v.optional(v.id("competitors")),
    title: v.string(),
    content: v.string(),
    url: v.optional(v.string()),
    signalType: v.union(
      v.literal("pain_point"),
      v.literal("feature_request"),
      v.literal("competitor_update"),
      v.literal("pricing_change"),
      v.literal("market_trend"),
      v.literal("feature_gap")
    ),
    relevanceScore: v.number(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral")
    ),
  },
  handler: async (ctx, args) => {
    const signalId = await ctx.db.insert("intelligenceSignals", {
      organizationId: args.organizationId,
      jobId: args.jobId,
      source: args.source,
      competitorId: args.competitorId,
      title: args.title,
      content: args.content,
      url: args.url,
      signalType: args.signalType,
      relevanceScore: args.relevanceScore,
      sentiment: args.sentiment,
      createdAt: Date.now(),
    });
    return signalId;
  },
});

/**
 * Create an intelligence job record
 */
export const createJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("reddit_scan"),
      v.literal("web_search"),
      v.literal("competitor_scrape"),
      v.literal("synthesis")
    ),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("intelligenceJobs", {
      organizationId: args.organizationId,
      type: args.type,
      status: "pending",
      startedAt: Date.now(),
    });
    return jobId;
  },
});

/**
 * Update job status and stats
 */
export const updateJob = internalMutation({
  args: {
    jobId: v.id("intelligenceJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    stats: v.optional(
      v.object({
        itemsFound: v.number(),
        itemsProcessed: v.number(),
        errors: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    if (args.stats) {
      updates.stats = args.stats;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

// ============================================
// ACTIONS
// ============================================

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

  return { scrapedContent, processed, errors, errorMessages };
};

/**
 * Main entry point: scrape a competitor's URLs, detect changes, and generate AI profiles
 */
export const scrapeCompetitor = internalAction({
  args: { competitorId: v.id("competitors") },
  handler: async (ctx, args) => {
    const competitor = await ctx.runQuery(
      internal.autopilot.intelligence.competitor_monitor.getCompetitor,
      { competitorId: args.competitorId }
    );

    if (!competitor) {
      throw new Error("Competitor not found");
    }

    const jobId = await ctx.runMutation(
      internal.autopilot.intelligence.competitor_monitor.createJob,
      { organizationId: competitor.organizationId, type: "competitor_scrape" }
    );

    await ctx.runMutation(
      internal.autopilot.intelligence.competitor_monitor.updateJob,
      {
        jobId,
        status: "processing",
      }
    );

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
      internal.autopilot.intelligence.competitor_monitor
        .updateCompetitorAfterScrape,
      {
        competitorId: args.competitorId,
        lastScrapedContent: combinedContent || undefined,
        lastScrapedAt: Date.now(),
        aiProfile,
        aiProfileUpdatedAt,
        featureList,
      }
    );

    await ctx.runMutation(
      internal.autopilot.intelligence.competitor_monitor.updateJob,
      {
        jobId,
        status: totalErrors === urlEntries.length ? "failed" : "completed",
        errorMessage:
          errorMessages.length > 0 ? errorMessages.join(" | ") : undefined,
        stats: {
          itemsFound: urlEntries.length,
          itemsProcessed: processed,
          errors: totalErrors,
        },
      }
    );
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
      internal.autopilot.intelligence.competitor_monitor.createSignal,
      {
        organizationId: competitor.organizationId,
        jobId,
        source: entry.source,
        competitorId: competitor._id,
        title: `${competitor.name} ${entry.key} change detected`,
        content: content.slice(0, 1000),
        url: entry.url,
        signalType,
        relevanceScore: 0.7,
        sentiment: "neutral",
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

  return { aiProfile, aiProfileUpdatedAt, featureList, errors };
};

// ============================================
// AI HELPERS
// ============================================

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
    schema: profileSchema,
    system:
      'You are a competitive intelligence analyst. Analyze the provided competitor website content and generate a SWOT analysis profile. Be specific and actionable in your analysis.\n\nRespond with ONLY valid JSON matching this exact format:\n{\n  "summary": "string",\n  "strengths": ["string"],\n  "weaknesses": ["string"],\n  "opportunities": ["string"],\n  "threats": ["string"]\n}',
    prompt: `Analyze this competitor and generate a SWOT profile:\n\nCOMPETITOR: ${competitorName}\n\nSCRAPED CONTENT:\n${contentSummary}\n\nProvide a concise summary, and list specific strengths, weaknesses, opportunities, and threats based on the content.`,
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
        schema: featureExtractionSchema,
        system:
          'You are a product analyst. Extract a list of product features from the provided website content. Focus on concrete, distinct features.\n\nRespond with ONLY valid JSON: { "features": ["feature1", "feature2", ...] }',
        prompt: `Extract the product features for "${competitorName}" from this page content:\n\n${content}\n\nList each distinct product feature mentioned or implied on this page.`,
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
