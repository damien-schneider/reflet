/**
 * Shared AI generation utilities for autopilot agents.
 *
 * Provides generateObjectWithFallback (structured output) and
 * generateTextWithWebSearch (real web search via OpenRouter server tool).
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, generateText } from "ai";
import type { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const RETRY_MAX_OUTPUT_TOKENS = 2048;

// ============================================
// COST TRACKING
// ============================================

/** Accumulated token usage across all LLM calls in the current action. */
let _actionTokenUsage = { inputTokens: 0, outputTokens: 0, calls: 0 };

/** Reset usage tracker — call at the start of each agent action. */
export const resetUsageTracker = (): void => {
  _actionTokenUsage = { inputTokens: 0, outputTokens: 0, calls: 0 };
};

/** Get accumulated usage for the current action. */
export const getUsageTracker = (): {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  estimatedCostUsd: number;
} => {
  // Conservative estimate: $0.15/1M input tokens, $0.60/1M output tokens (free models = $0)
  // This covers the paid fallback models; free models have no cost but we track usage anyway
  const inputCost = (_actionTokenUsage.inputTokens / 1_000_000) * 0.15;
  const outputCost = (_actionTokenUsage.outputTokens / 1_000_000) * 0.6;
  return {
    ..._actionTokenUsage,
    estimatedCostUsd: inputCost + outputCost,
  };
};

const trackUsage = (usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}): void => {
  _actionTokenUsage.inputTokens += usage.inputTokens ?? 0;
  _actionTokenUsage.outputTokens += usage.outputTokens ?? 0;
  _actionTokenUsage.calls++;
};

const isTokenLimitError = (message: string): boolean =>
  message.includes("token") ||
  message.includes("credit") ||
  message.includes("limit");

const tryGenerateObject = async <T extends z.ZodType>(
  model: string,
  schema: T,
  prompt: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<z.infer<T>> => {
  const result = await generateObject({
    model: openrouter(model),
    schema,
    prompt,
    system: `${systemPrompt}\n\nRespond in JSON format.`,
    temperature,
    maxTokens,
  });

  trackUsage(result.usage);
  return result.object as z.infer<T>;
};

const tryModelWithRetry = async <T extends z.ZodType>(
  model: string,
  schema: T,
  prompt: string,
  systemPrompt: string,
  temperature: number,
  tokenLimit: number,
  errors: Array<{ model: string; error: string }>
): Promise<z.infer<T> | undefined> => {
  try {
    return await tryGenerateObject(
      model,
      schema,
      prompt,
      systemPrompt,
      temperature,
      tokenLimit
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ model, error: message });

    if (!isTokenLimitError(message) || tokenLimit <= RETRY_MAX_OUTPUT_TOKENS) {
      return undefined;
    }

    try {
      return await tryGenerateObject(
        model,
        schema,
        prompt,
        systemPrompt,
        temperature,
        RETRY_MAX_OUTPUT_TOKENS
      );
    } catch (retryError) {
      const retryMessage =
        retryError instanceof Error ? retryError.message : String(retryError);
      errors.push({
        model,
        error: `retry(${RETRY_MAX_OUTPUT_TOKENS}): ${retryMessage}`,
      });
      return undefined;
    }
  }
};

/**
 * Generate a structured object using AI with model fallback.
 * Tries each model in sequence until one succeeds.
 */
export const generateObjectWithFallback = async <T extends z.ZodType>({
  models,
  schema,
  prompt,
  systemPrompt,
  temperature,
  maxOutputTokens,
}: {
  models: readonly string[];
  schema: T;
  prompt: string;
  systemPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<z.infer<T>> => {
  const errors: Array<{ model: string; error: string }> = [];
  const tokenLimit = maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const temp = temperature ?? 0;

  for (const model of models) {
    const result = await tryModelWithRetry(
      model,
      schema,
      prompt,
      systemPrompt,
      temp,
      tokenLimit,
      errors
    );
    if (result !== undefined) {
      return result;
    }
  }

  const errorDetails = errors
    .map((e) => `  [${e.model}]: ${e.error}`)
    .join("\n");

  throw new Error(`All ${models.length} models failed:\n${errorDetails}`);
};

// ============================================
// WEB SEARCH (openrouter:web_search server tool)
// ============================================

interface UrlCitation {
  content: string;
  title: string;
  url: string;
}

interface WebSearchConfig {
  /** Restrict results to these domains */
  allowed_domains?: string[];
  /** Exclude results from these domains */
  excluded_domains?: string[];
  /** Max results per search (1-25, default 5) */
  max_results?: number;
}

interface WebSearchResult {
  citations: UrlCitation[];
  text: string;
}

const extractCitations = (response: {
  response?: {
    messages?: Array<{
      role: string;
      annotations?: Array<{
        type: string;
        url_citation?: {
          url: string;
          title: string;
          content: string;
        };
      }>;
    }>;
  };
}): UrlCitation[] => {
  const citations: UrlCitation[] = [];
  const messages = response.response?.messages;
  if (!Array.isArray(messages)) {
    return citations;
  }
  for (const message of messages) {
    if (!Array.isArray(message.annotations)) {
      continue;
    }
    for (const annotation of message.annotations) {
      if (annotation.type === "url_citation" && annotation.url_citation) {
        citations.push({
          url: annotation.url_citation.url,
          title: annotation.url_citation.title,
          content: annotation.url_citation.content,
        });
      }
    }
  }
  return citations;
};

const tryGenerateTextWithSearch = async (
  model: string,
  prompt: string,
  systemPrompt: string,
  searchConfig: WebSearchConfig,
  errors: Array<{ model: string; error: string }>
): Promise<WebSearchResult | undefined> => {
  try {
    const parameters: Record<string, unknown> = {};
    if (searchConfig.max_results) {
      parameters.max_results = searchConfig.max_results;
    }
    if (searchConfig.allowed_domains) {
      parameters.allowed_domains = searchConfig.allowed_domains;
    }
    if (searchConfig.excluded_domains) {
      parameters.excluded_domains = searchConfig.excluded_domains;
    }

    const webSearchTool =
      Object.keys(parameters).length > 0
        ? { type: "openrouter:web_search", parameters }
        : { type: "openrouter:web_search" };

    const result = await generateText({
      model: openrouter(model),
      prompt,
      system: systemPrompt,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
      // The AI SDK OpenRouter provider only passes type: "function" tools.
      // openrouter:web_search is a server tool — inject via extraBody.
      providerOptions: {
        openrouter: {
          extraBody: JSON.parse(JSON.stringify({ tools: [webSearchTool] })),
        },
      },
    });

    trackUsage(result.usage);
    const citations = extractCitations(result as never);

    return { text: result.text, citations };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ model, error: message });
    return undefined;
  }
};

/**
 * Generate text with real web search via OpenRouter's server tool.
 * The model decides when/whether to search. Returns text + real URL citations.
 */
export const generateTextWithWebSearch = async ({
  models,
  prompt,
  systemPrompt,
  searchConfig = {},
}: {
  models: readonly string[];
  prompt: string;
  systemPrompt: string;
  searchConfig?: WebSearchConfig;
}): Promise<WebSearchResult> => {
  const errors: Array<{ model: string; error: string }> = [];

  for (const model of models) {
    const result = await tryGenerateTextWithSearch(
      model,
      prompt,
      systemPrompt,
      searchConfig,
      errors
    );
    if (result !== undefined) {
      return result;
    }
  }

  const errorDetails = errors
    .map((e) => `  [${e.model}]: ${e.error}`)
    .join("\n");

  throw new Error(
    `Web search: all ${models.length} models failed:\n${errorDetails}`
  );
};

// ============================================
// URL VALIDATION
// ============================================

const URL_VALIDATION_TIMEOUT_MS = 5000;

interface UrlValidation {
  reason?: string;
  status?: number;
  valid: boolean;
}

/**
 * Validate a single URL with an HTTP HEAD request.
 * Returns valid: false for 404, network errors, or timeouts.
 */
export const validateUrl = async (url: string): Promise<UrlValidation> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      URL_VALIDATION_TIMEOUT_MS
    );

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.dev)",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { valid: true, status: response.status };
    }

    // Some sites block HEAD — retry with GET for non-404 errors
    if (response.status === 405 || response.status === 403) {
      const getController = new AbortController();
      const getTimeout = setTimeout(
        () => getController.abort(),
        URL_VALIDATION_TIMEOUT_MS
      );

      const getResponse = await fetch(url, {
        method: "GET",
        signal: getController.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; RefletBot/1.0; +https://reflet.dev)",
        },
      });

      clearTimeout(getTimeout);

      return {
        valid: getResponse.ok,
        status: getResponse.status,
        reason: getResponse.ok ? undefined : `HTTP ${getResponse.status}`,
      };
    }

    return {
      valid: false,
      status: response.status,
      reason: `HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = message.includes("abort") ? "timeout" : message;
    return { valid: false, reason };
  }
};

/**
 * Validate multiple URLs in parallel. Returns a map of URL → validation result.
 */
export const validateUrls = async (
  urls: string[]
): Promise<Map<string, UrlValidation>> => {
  const results = await Promise.allSettled(
    urls.map(async (url) => ({ url, result: await validateUrl(url) }))
  );

  const map = new Map<string, UrlValidation>();
  for (const entry of results) {
    if (entry.status === "fulfilled") {
      map.set(entry.value.url, entry.value.result);
    } else {
      const url = urls[results.indexOf(entry)];
      map.set(url, { valid: false, reason: "validation failed" });
    }
  }
  return map;
};
