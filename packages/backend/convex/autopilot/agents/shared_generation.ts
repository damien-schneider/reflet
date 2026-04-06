/**
 * Shared AI structured-object generation utilities for autopilot agents.
 *
 * Provides the OpenRouter client, token usage tracking, and
 * generateObjectWithFallback (structured output with model fallback).
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import type { z } from "zod";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
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

export const trackUsage = (usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}): void => {
  _actionTokenUsage.inputTokens += usage.inputTokens ?? 0;
  _actionTokenUsage.outputTokens += usage.outputTokens ?? 0;
  _actionTokenUsage.calls++;
};

// ============================================
// STRUCTURED OBJECT GENERATION
// ============================================

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
