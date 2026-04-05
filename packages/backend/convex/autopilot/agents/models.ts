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
  /** Free model with online search capability */
  SEARCH_FREE: "qwen/qwen3.6-plus:free:online",
  /** Paid model with online search capability */
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

/** Free model fallback chain with web search — tried in order when rate-limited */
export const SEARCH_MODEL_FALLBACKS = [
  "qwen/qwen3.6-plus:free:online",
  "openai/gpt-5.4-mini:online",
] as const;

/** Standard agent model chain: all free fallbacks, then paid */
export const AGENT_MODELS = [...FREE_MODEL_FALLBACKS, MODELS.FAST] as const;
