/**
 * Shared model constants for all autopilot agents.
 *
 * Centralizes model references so they can be updated in one place.
 * Uses OpenRouter model IDs.
 */

export const MODELS = {
  /** Free inference — high-quality open model (default) */
  FREE: "qwen/qwen3.6-plus:free",
  /** Fast paid fallback */
  FAST: "openai/gpt-5.4-mini",
  /** Smartest model — defaults to free, falls back to paid */
  SMART: "qwen/qwen3.6-plus:free",
  /**
   * @deprecated Use WEB_SEARCH_MODELS with generateTextWithWebSearch instead.
   * The :online plugin is deprecated by OpenRouter in favor of the
   * openrouter:web_search server tool.
   */
  SEARCH_FREE: "qwen/qwen3.6-plus:free:online",
  /**
   * @deprecated Use WEB_SEARCH_MODELS with generateTextWithWebSearch instead.
   */
  SEARCH_PAID: "openai/gpt-5.4-mini:online",
} as const;

/** Free model fallback chain — tried in order when rate-limited */
export const FREE_MODEL_FALLBACKS = [
  "qwen/qwen3.6-plus:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "stepfun/step-3.5-flash:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-coder:free",
] as const;

/**
 * @deprecated Use WEB_SEARCH_MODELS with generateTextWithWebSearch instead.
 * The :online plugin suffix is deprecated by OpenRouter. Use the
 * openrouter:web_search server tool via generateTextWithWebSearch.
 */
export const SEARCH_MODEL_FALLBACKS = [
  "qwen/qwen3.6-plus:free:online",
  "openai/gpt-5.4-mini:online",
] as const;

/**
 * Models for use with generateTextWithWebSearch (openrouter:web_search server tool).
 * These are regular models — web search is injected via the server tool, not the model suffix.
 */
export const WEB_SEARCH_MODELS = [
  "qwen/qwen3.6-plus:free",
  "openai/gpt-5.4-mini",
] as const;

/** Standard agent model chain: all free fallbacks, then paid */
export const AGENT_MODELS = [...FREE_MODEL_FALLBACKS, MODELS.FAST] as const;
