import { z } from "zod";

// Top-level regex patterns
const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
const SCRIPT_TAG_REGEX = /<script[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

// AI model configuration
export const PROFILE_MODEL = "anthropic/claude-sonnet-4";
export const EXTRACTION_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
  "z-ai/glm-4.7-flash",
] as const;

// Max content length per URL
export const MAX_CONTENT_LENGTH = 5000;

// AI schemas
export const profileSchema = z.object({
  opportunities: z.array(z.string()),
  strengths: z.array(z.string()),
  summary: z.string(),
  threats: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const featureExtractionSchema = z.object({
  features: z
    .array(z.string())
    .describe("List of product features detected on the page"),
});

export type ProfileResponse = z.infer<typeof profileSchema>;
export type FeatureExtractionResponse = z.infer<typeof featureExtractionSchema>;

export interface UrlEntry {
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
export const buildUrlEntries = (competitor: {
  websiteUrl: string;
  changelogUrl?: string;
  pricingUrl?: string;
  featuresUrl?: string;
}): UrlEntry[] => {
  const entries: UrlEntry[] = [];
  if (competitor.websiteUrl) {
    entries.push({ key: "website", source: "web", url: competitor.websiteUrl });
  }
  if (competitor.changelogUrl) {
    entries.push({
      key: "changelog",
      source: "competitor_changelog",
      url: competitor.changelogUrl,
    });
  }
  if (competitor.pricingUrl) {
    entries.push({
      key: "pricing",
      source: "competitor_pricing",
      url: competitor.pricingUrl,
    });
  }
  if (competitor.featuresUrl) {
    entries.push({
      key: "features",
      source: "competitor_features",
      url: competitor.featuresUrl,
    });
  }
  return entries;
};

/**
 * Extract a named section from combined scraped content
 */
export const extractSection = (content: string, key: string): string => {
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
export const fetchAndExtract = async (
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
