/**
 * Shared model constants for all autopilot agents.
 *
 * Tiered model strategy:
 * - FAST_MODELS: Free models for low-stakes work (gap assessment, drafts, follow-ups)
 * - QUALITY_MODELS: Paid models for decisions (task creation, specs, lead structuring)
 * - Max 3 models per tier to avoid wasting API calls on cascading failures
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

/**
 * FAST tier — free models for low-stakes work.
 * Used for: gap assessment, follow-up notes, content drafts, pattern detection.
 * Max 3 models to avoid cascading failure waste.
 */
export const FAST_MODELS = [
  "qwen/qwen3.6-plus:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

/**
 * QUALITY tier — paid models for decisions that matter.
 * Used for: PM task creation, CTO spec generation, Sales lead structuring,
 * CEO coordination, content quality scoring.
 * Starts with best free model, falls back to paid.
 */
export const QUALITY_MODELS = [
  "qwen/qwen3.6-plus:free",
  "openai/gpt-5.4-mini",
] as const;

/** @deprecated Use FAST_MODELS or QUALITY_MODELS instead. */
export const FREE_MODEL_FALLBACKS = FAST_MODELS;

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

/** @deprecated Use FAST_MODELS or QUALITY_MODELS based on task importance. */
export const AGENT_MODELS = [...FAST_MODELS, MODELS.FAST] as const;
