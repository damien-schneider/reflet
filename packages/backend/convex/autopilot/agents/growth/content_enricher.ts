/**
 * Content enricher — fetches actual thread content for discovered URLs.
 *
 * Strategies by platform:
 * - Reddit: .json endpoint (free, structured) → Exa fallback
 * - HN: Algolia API (free, structured) → Exa fallback
 * - Twitter/LinkedIn: Exa only (these platforms block direct scraping)
 * - Other: Direct fetch + HTML extraction
 */

import { type DiscoveredThread, fetchUrlContent } from "../shared_search";

// ============================================
// TYPES
// ============================================

export interface EnrichedThread {
  authorName: string;
  commentCount: number;
  community: string;
  originalPostContent: string;
  platform: "reddit" | "hackernews" | "twitter" | "linkedin";
  postAge: string;
  publishedDate: string | null;
  searchSnippet: string;
  title: string;
  topComments: string[];
  url: string;
}

// ============================================
// REDDIT ENRICHMENT (.json endpoint)
// ============================================

const REDDIT_FETCH_TIMEOUT_MS = 8000;

const enrichRedditThread = async (
  thread: DiscoveredThread
): Promise<EnrichedThread | null> => {
  try {
    const jsonUrl = buildRedditJsonUrl(thread.url);
    if (!jsonUrl) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REDDIT_FETCH_TIMEOUT_MS
    );

    const response = await fetch(jsonUrl, {
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

    const data: unknown = await response.json();
    return parseRedditJson(data, thread);
  } catch {
    return null;
  }
};

const REDDIT_URL_PATTERN = /reddit\.com\/r\/\w+\/comments\/\w+/;
const TRAILING_SLASH_PATTERN = /\/$/;

const buildRedditJsonUrl = (url: string): string | null => {
  if (!REDDIT_URL_PATTERN.test(url)) {
    return null;
  }
  // Strip query params and trailing slash, append .json
  const cleanUrl = url.split("?")[0].replace(TRAILING_SLASH_PATTERN, "");
  return `${cleanUrl}.json`;
};

const parseRedditJson = (
  data: unknown,
  thread: DiscoveredThread
): EnrichedThread | null => {
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }

  const postData = data[0]?.data?.children?.[0]?.data;
  if (!postData) {
    return null;
  }

  const comments = data[1]?.data?.children ?? [];
  const topComments = extractRedditComments(comments, 5);

  return {
    url: thread.url,
    title: postData.title ?? thread.title,
    platform: "reddit",
    originalPostContent:
      postData.selftext?.slice(0, 3000) ?? postData.title ?? "",
    topComments,
    community: postData.subreddit ? `r/${postData.subreddit}` : "unknown",
    postAge: formatRedditAge(postData.created_utc),
    commentCount: postData.num_comments ?? 0,
    authorName: postData.author ?? "unknown",
    searchSnippet: thread.searchSnippet,
    publishedDate: thread.publishedDate,
  };
};

const extractRedditComments = (
  children: Array<{ data?: { body?: string; score?: number } }>,
  limit: number
): string[] => {
  return children
    .filter(
      (c): c is { data: { body: string; score?: number } } =>
        typeof c.data?.body === "string" && c.data.body.length > 0
    )
    .sort((a, b) => (b.data.score ?? 0) - (a.data.score ?? 0))
    .slice(0, limit)
    .map((c) => c.data.body.slice(0, 500));
};

const formatRedditAge = (createdUtc: number | undefined): string => {
  if (!createdUtc) {
    return "unknown";
  }
  const ageMs = Date.now() - createdUtc * 1000;
  return formatAge(ageMs);
};

// ============================================
// HACKER NEWS ENRICHMENT (Algolia API)
// ============================================

const HN_API_BASE = "https://hn.algolia.com/api/v1/items";
const HN_ID_PATTERN = /news\.ycombinator\.com\/item\?id=(\d+)/;

const enrichHNThread = async (
  thread: DiscoveredThread
): Promise<EnrichedThread | null> => {
  try {
    const idMatch = thread.url.match(HN_ID_PATTERN);
    if (!idMatch?.[1]) {
      return null;
    }

    const response = await fetch(`${HN_API_BASE}/${idMatch[1]}`);
    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    return parseHNJson(data, thread);
  } catch {
    return null;
  }
};

const parseHNJson = (
  data: unknown,
  thread: DiscoveredThread
): EnrichedThread | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const item = data as Record<string, unknown>;
  const children = Array.isArray(item.children) ? item.children : [];

  const topComments = children
    .filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Record<string, unknown>).text === "string"
    )
    .slice(0, 5)
    .map((c) => String(c.text).slice(0, 500));

  const createdAt =
    typeof item.created_at === "string"
      ? new Date(item.created_at).getTime()
      : null;

  return {
    url: thread.url,
    title: typeof item.title === "string" ? item.title : thread.title,
    platform: "hackernews",
    originalPostContent: getHNPostContent(item),
    topComments,
    community: "Hacker News",
    postAge: createdAt ? formatAge(Date.now() - createdAt) : "unknown",
    commentCount: children.length,
    authorName: typeof item.author === "string" ? item.author : "unknown",
    searchSnippet: thread.searchSnippet,
    publishedDate: thread.publishedDate,
  };
};

// ============================================
// GENERIC ENRICHMENT (Exa or direct fetch)
// ============================================

const enrichViaFetch = async (
  thread: DiscoveredThread
): Promise<EnrichedThread> => {
  const contentMap = await fetchUrlContent([thread.url]);
  const content = contentMap.get(thread.url) ?? thread.searchSnippet;

  return {
    url: thread.url,
    title: thread.title,
    platform: thread.platform,
    originalPostContent: content.slice(0, 3000),
    topComments: [],
    community: thread.platform,
    postAge: thread.publishedDate
      ? formatAge(Date.now() - new Date(thread.publishedDate).getTime())
      : "unknown",
    commentCount: 0,
    authorName: "unknown",
    searchSnippet: thread.searchSnippet,
    publishedDate: thread.publishedDate,
  };
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Enrich discovered threads with actual content.
 * Uses platform-specific strategies for best data quality.
 */
export const enrichThreads = async (
  threads: DiscoveredThread[]
): Promise<EnrichedThread[]> => {
  const results = await Promise.allSettled(
    threads.map((thread) => enrichSingleThread(thread))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<EnrichedThread> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
};

const enrichSingleThread = async (
  thread: DiscoveredThread
): Promise<EnrichedThread> => {
  // Try platform-specific enrichment first
  if (thread.platform === "reddit") {
    const result = await enrichRedditThread(thread);
    if (result) {
      return result;
    }
  }

  if (thread.platform === "hackernews") {
    const result = await enrichHNThread(thread);
    if (result) {
      return result;
    }
  }

  // For Twitter/LinkedIn or failed platform-specific enrichment,
  // use Exa (if available) or direct fetch
  return enrichViaFetch(thread);
};

// ============================================
// HELPERS
// ============================================

const getHNPostContent = (item: Record<string, unknown>): string => {
  if (typeof item.text === "string") {
    return item.text.slice(0, 3000);
  }
  if (typeof item.url === "string") {
    return `Link: ${item.url}`;
  }
  return "";
};

const formatAge = (ageMs: number): string => {
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  if (hours < 1) {
    return "just now";
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} days ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks} weeks ago`;
  }
  const months = Math.floor(days / 30);
  return `${months} months ago`;
};
