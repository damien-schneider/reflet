/**
 * Exa.ai REST client — thin fetch wrapper for search + content retrieval.
 *
 * No SDK dependency — direct REST calls to https://api.exa.ai.
 * Auth via x-api-key header. Tracks cost from every response.
 */

import { z } from "zod";

const EXA_BASE_URL = "https://api.exa.ai";

// ============================================
// ENVIRONMENT
// ============================================

export const isExaAvailable = (): boolean => !!process.env.EXA_API_KEY;

const getApiKey = (): string => {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error("EXA_API_KEY not set");
  }
  return key;
};

// ============================================
// TYPES
// ============================================

export interface ExaSearchParams {
  category?: "company" | "people" | "news" | "personal site";
  contents?: {
    text?: { maxCharacters?: number };
    highlights?: { maxCharacters?: number; query?: string };
  };
  endPublishedDate?: string;
  excludeDomains?: string[];
  /** Only single-item array (max 5 words) — multi-item causes 400 */
  excludeText?: [string];
  includeDomains?: string[];
  /** Only single-item array (max 5 words) — multi-item causes 400 */
  includeText?: [string];
  numResults?: number;
  query: string;
  startPublishedDate?: string;
  type?: "auto" | "neural" | "keyword" | "fast";
}

export interface ExaResult {
  author: string | null;
  highlightScores?: number[];
  highlights?: string[];
  publishedDate: string | null;
  text?: string;
  title: string;
  url: string;
}

export interface ExaSearchResponse {
  costDollars: { total: number };
  results: ExaResult[];
}

// Response validation schema — guards against malformed API responses
const exaResultSchema = z.object({
  url: z.string(),
  title: z.string().default(""),
  publishedDate: z.string().nullable().default(null),
  author: z.string().nullable().default(null),
  text: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  highlightScores: z.array(z.number()).optional(),
});

const exaResponseSchema = z.object({
  results: z.array(exaResultSchema),
  costDollars: z.object({ total: z.number() }).default({ total: 0 }),
});

// ============================================
// COST TRACKING
// ============================================

let _exaCostUsd = 0;

export const resetExaCostTracker = (): void => {
  _exaCostUsd = 0;
};

export const getExaCostUsd = (): number => _exaCostUsd;

// ============================================
// CORE API
// ============================================

/**
 * Search via Exa REST API. Returns results + cost.
 *
 * Respects Exa constraints:
 * - `category: "company"/"people"` disables date/text filters and excludeDomains
 * - `includeText`/`excludeText` accept only single-item arrays (max 5 words)
 */
export const searchWithExa = async (
  params: ExaSearchParams
): Promise<ExaSearchResponse> => {
  const body = buildSearchBody(params);

  const response = await fetch(`${EXA_BASE_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exa search failed (${response.status}): ${text}`);
  }

  const raw: unknown = await response.json();
  const parsed = exaResponseSchema.parse(raw);

  _exaCostUsd += parsed.costDollars.total;
  return parsed;
};

/**
 * Fetch content for specific URLs via Exa's contents endpoint.
 * Useful for enriching discovered URLs with full page text.
 */
export const fetchContentWithExa = async (
  urls: string[],
  options?: { maxCharacters?: number }
): Promise<ExaResult[]> => {
  if (urls.length === 0) {
    return [];
  }

  const response = await fetch(`${EXA_BASE_URL}/contents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      urls,
      text: { maxCharacters: options?.maxCharacters ?? 5000 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exa contents failed (${response.status}): ${text}`);
  }

  const raw: unknown = await response.json();
  const parsed = exaResponseSchema.parse(raw);

  _exaCostUsd += parsed.costDollars.total;
  return parsed.results;
};

// ============================================
// HELPERS
// ============================================

const buildSearchBody = (params: ExaSearchParams): Record<string, unknown> => {
  const usesCategory =
    params.category === "company" || params.category === "people";

  const body: Record<string, unknown> = {
    query: params.query,
    numResults: params.numResults ?? 10,
    type: params.type ?? "auto",
  };

  if (params.category) {
    body.category = params.category;
  }

  if (params.includeDomains?.length) {
    body.includeDomains = params.includeDomains;
  }

  // Category "company"/"people" disables these fields
  if (!usesCategory) {
    if (params.excludeDomains?.length) {
      body.excludeDomains = params.excludeDomains;
    }
    if (params.startPublishedDate) {
      body.startPublishedDate = params.startPublishedDate;
    }
    if (params.endPublishedDate) {
      body.endPublishedDate = params.endPublishedDate;
    }
    if (params.includeText?.length) {
      body.includeText = params.includeText;
    }
    if (params.excludeText?.length) {
      body.excludeText = params.excludeText;
    }
  }

  if (params.contents) {
    body.contents = params.contents;
  }

  return body;
};
