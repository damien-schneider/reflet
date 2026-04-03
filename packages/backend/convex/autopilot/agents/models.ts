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
