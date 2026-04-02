/**
 * Shared model constants for all autopilot agents.
 *
 * Centralizes model references so they can be updated in one place.
 * Uses OpenRouter model IDs.
 */

export const MODELS = {
  /** Free inference — high-quality open model */
  FREE: "qwen/qwen3-235b-a22b:free",
  /** Fast paid model — good cost/quality balance */
  FAST: "openai/gpt-4.1-mini",
  /** Smartest paid model — for complex reasoning */
  SMART: "anthropic/claude-sonnet-4",
  /** Free model with online search capability */
  SEARCH_FREE: "qwen/qwen3-235b-a22b:free:online",
  /** Paid model with online search capability */
  SEARCH_PAID: "openai/gpt-4.1-mini:online",
} as const;
