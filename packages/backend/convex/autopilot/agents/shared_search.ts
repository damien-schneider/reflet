/**
 * Shared search layer — unified search abstraction for Growth and Sales agents.
 *
 * Uses Exa.ai when available (EXA_API_KEY set), falls back to OpenRouter
 * web search. Both paths produce the same DiscoveredThread[] output.
 */

import { WEB_SEARCH_MODELS } from "./models";
import type { ExaSearchParams } from "./shared_exa";
import {
  fetchContentWithExa,
  getExaCostUsd,
  isExaAvailable,
  resetExaCostTracker,
  searchWithExa,
} from "./shared_exa";
import { generateTextWithWebSearch } from "./shared_web";

// ============================================
// TYPES
// ============================================

export interface SearchQuery {
  intent:
    | "problem_search"
    | "competitor_alternative"
    | "pain_point"
    | "recommendation_request"
    | "lead_signal"
    | "company_signal";
  platform: "reddit" | "hackernews" | "twitter" | "linkedin" | "general";
  query: string;
}

export interface DiscoveredThread {
  platform: "reddit" | "hackernews" | "twitter" | "linkedin";
  publishedDate: string | null;
  searchSnippet: string;
  title: string;
  url: string;
}

// ============================================
// PLATFORM → DOMAIN MAPPING
// ============================================

const PLATFORM_DOMAINS: Record<string, string[]> = {
  reddit: ["reddit.com"],
  hackernews: ["news.ycombinator.com"],
  twitter: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  general: [],
} as const;

const ALL_COMMUNITY_DOMAINS = [
  "reddit.com",
  "news.ycombinator.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "indiehackers.com",
  "dev.to",
  "hashnode.com",
  "medium.com",
];

// ============================================
// EXA SEARCH PATH
// ============================================

const searchViaExa = async (
  queries: SearchQuery[]
): Promise<DiscoveredThread[]> => {
  resetExaCostTracker();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const results: DiscoveredThread[] = [];
  const seenUrls = new Set<string>();

  for (const q of queries) {
    const params: ExaSearchParams = {
      query: q.query,
      numResults: 5,
      type: "auto",
      startPublishedDate: thirtyDaysAgo,
      contents: {
        highlights: { maxCharacters: 2000, query: q.query },
      },
    };

    const domains = PLATFORM_DOMAINS[q.platform];
    if (domains?.length) {
      params.includeDomains = domains;
    }

    try {
      const response = await searchWithExa(params);

      for (const result of response.results) {
        if (seenUrls.has(result.url)) {
          continue;
        }
        seenUrls.add(result.url);

        results.push({
          url: result.url,
          title: result.title,
          platform: detectPlatform(result.url) ?? inferPlatform(q.platform),
          searchSnippet:
            result.highlights?.join("\n") ?? result.text?.slice(0, 500) ?? "",
          publishedDate: result.publishedDate,
        });
      }
    } catch {
      // Individual query failure — continue with remaining queries
    }
  }

  return results;
};

// ============================================
// WEB SEARCH FALLBACK PATH
// ============================================

const searchViaWebSearch = async (
  queries: SearchQuery[]
): Promise<DiscoveredThread[]> => {
  const results: DiscoveredThread[] = [];
  const seenUrls = new Set<string>();

  for (const q of queries) {
    const domains = PLATFORM_DOMAINS[q.platform];

    try {
      const { citations } = await generateTextWithWebSearch({
        models: WEB_SEARCH_MODELS,
        prompt: q.query,
        systemPrompt:
          "Search for community discussions matching this query. Return the most relevant recent results.",
        searchConfig: {
          max_results: 5,
          allowed_domains: domains?.length ? domains : ALL_COMMUNITY_DOMAINS,
        },
      });

      for (const citation of citations) {
        if (seenUrls.has(citation.url)) {
          continue;
        }
        seenUrls.add(citation.url);

        const platform = detectPlatform(citation.url);
        if (!platform) {
          continue;
        }

        results.push({
          url: citation.url,
          title: citation.title,
          platform,
          searchSnippet: citation.content,
          publishedDate: null,
        });
      }
    } catch {
      // Individual query failure — continue with remaining queries
    }
  }

  return results;
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Execute search queries through Exa (preferred) or web search (fallback).
 * Deduplicates results by URL across all queries.
 */
export const executeSearchQueries = async (
  queries: SearchQuery[]
): Promise<DiscoveredThread[]> => {
  if (queries.length === 0) {
    return [];
  }

  if (isExaAvailable()) {
    try {
      return await searchViaExa(queries);
    } catch {
      // Exa failed entirely — fall back to web search
    }
  }

  return searchViaWebSearch(queries);
};

/**
 * Fetch full page content for URLs via Exa or direct fetch.
 * Returns a map of URL → text content.
 */
export const fetchUrlContent = async (
  urls: string[]
): Promise<Map<string, string>> => {
  const contentMap = new Map<string, string>();

  if (urls.length === 0) {
    return contentMap;
  }

  if (isExaAvailable()) {
    try {
      const results = await fetchContentWithExa(urls, {
        maxCharacters: 5000,
      });
      for (const result of results) {
        if (result.text) {
          contentMap.set(result.url, result.text);
        }
      }
      return contentMap;
    } catch {
      // Fall through to direct fetch
    }
  }

  // Direct fetch fallback for remaining URLs
  const unfetched = urls.filter((u) => !contentMap.has(u));
  const fetchResults = await Promise.allSettled(
    unfetched.map((url) => fetchUrlDirectly(url))
  );

  for (let i = 0; i < unfetched.length; i++) {
    const result = fetchResults[i];
    if (result?.status === "fulfilled" && result.value) {
      contentMap.set(unfetched[i], result.value);
    }
  }

  return contentMap;
};

/** Get accumulated Exa cost for the current action. */
export const getSearchCostUsd = (): number => getExaCostUsd();

// ============================================
// HELPERS
// ============================================

const PLATFORM_PATTERNS = [
  { pattern: /reddit\.com/, platform: "reddit" as const },
  { pattern: /news\.ycombinator\.com/, platform: "hackernews" as const },
  { pattern: /(?:x|twitter)\.com/, platform: "twitter" as const },
  { pattern: /linkedin\.com/, platform: "linkedin" as const },
];

const detectPlatform = (
  url: string
): "reddit" | "hackernews" | "twitter" | "linkedin" | undefined => {
  for (const { pattern, platform } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) {
      return platform;
    }
  }
  return undefined;
};

const inferPlatform = (
  queryPlatform: string
): "reddit" | "hackernews" | "twitter" | "linkedin" => {
  if (
    queryPlatform === "reddit" ||
    queryPlatform === "hackernews" ||
    queryPlatform === "twitter" ||
    queryPlatform === "linkedin"
  ) {
    return queryPlatform;
  }
  return "reddit";
};

const FETCH_TIMEOUT_MS = 8000;

const fetchUrlDirectly = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.dev)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return stripHtmlTags(html).slice(0, 5000);
  } catch {
    return null;
  }
};

const HTML_TAG_PATTERN = /<[^>]*>/g;
const WHITESPACE_PATTERN = /\s+/g;

const stripHtmlTags = (html: string): string =>
  html.replace(HTML_TAG_PATTERN, " ").replace(WHITESPACE_PATTERN, " ").trim();
