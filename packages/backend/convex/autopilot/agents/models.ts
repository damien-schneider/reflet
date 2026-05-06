/**
 * Shared model constants for all autopilot agents.
 *
 * Strict tier routing (Tran & Kiela 2026 + iternal.ai 2026 hierarchical
 * routing 97.7% accuracy at 61% cost):
 * - PRODUCER agents (PM, CTO, Growth, Sales, Support) → FAST_MODELS only.
 * - ORCHESTRATOR + VALIDATOR roles (CEO, Validator) → QUALITY_MODELS only.
 *
 * Producer agents handle bounded chain nodes. Decisions are bounded too —
 * frontier models add cost without proportional accuracy gains here.
 */

export const MODELS = {
  /** Free inference — high-quality open model (default) */
  FREE: "qwen/qwen3.6-plus:free",
  /** Fast paid fallback */
  FAST: "openai/gpt-5.4-mini",
  /** Smartest model — defaults to free, falls back to paid */
  SMART: "qwen/qwen3.6-plus:free",
} as const;

/**
 * FAST tier — for all PRODUCER agents (PM, CTO, Growth, Sales, Support).
 * Use for: drafts, classifications, enrichments, content generation, search.
 */
export const FAST_MODELS = [
  "qwen/qwen3.6-plus:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

/**
 * QUALITY tier — RESERVED for ORCHESTRATOR (CEO) and VALIDATOR roles.
 * Use for: cross-agent coordination, scoring rubric application, terminal decisions.
 * Producer agents must NOT use this tier.
 */
export const QUALITY_MODELS = [
  "qwen/qwen3.6-plus:free",
  "openai/gpt-5.4-mini",
] as const;

/**
 * Models for use with generateTextWithWebSearch (openrouter:web_search server tool).
 * These are regular models — web search is injected via the server tool, not the model suffix.
 */
export const WEB_SEARCH_MODELS = [
  "qwen/qwen3.6-plus:free",
  "openai/gpt-5.4-mini",
] as const;
