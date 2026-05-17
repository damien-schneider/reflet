"use node";

import type { LanguageModelV3 } from "@ai-sdk/provider";
import { Agent } from "@mastra/core/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../../shared/env";
import { EXPLORATION_INSTRUCTIONS } from "./prompts";
import { codebaseTools } from "./tools";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const DEFAULT_CODEBASE_MODEL = "openai/gpt-5-mini";
export const FALLBACK_CODEBASE_MODELS = [
  "openai/gpt-5-mini",
  "anthropic/claude-sonnet-4.6",
  "google/gemini-2.5-pro",
] as const;

export const SYNTHESIS_MODEL = "anthropic/claude-sonnet-4.6";

export type CodebaseModel = string | LanguageModelV3;

export function createCodebaseAgent(
  model: CodebaseModel = DEFAULT_CODEBASE_MODEL
) {
  const resolvedModel = typeof model === "string" ? openrouter(model) : model;
  return new Agent({
    id: "codebase-reader",
    name: "Codebase Reader",
    instructions: EXPLORATION_INSTRUCTIONS,
    model: resolvedModel,
    tools: codebaseTools,
  });
}

export function createSynthesisModel(
  model: CodebaseModel = SYNTHESIS_MODEL
): LanguageModelV3 | ReturnType<typeof openrouter> {
  return typeof model === "string" ? openrouter(model) : model;
}
