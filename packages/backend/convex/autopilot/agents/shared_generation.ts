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

/** Per-model cost rates (USD per 1M tokens). Updated from OpenRouter pricing. */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Free models — actually free
  "qwen/qwen3.6-plus:free": { input: 0, output: 0 },
  "nvidia/nemotron-3-super-120b-a12b:free": { input: 0, output: 0 },
  "minimax/minimax-m2.5:free": { input: 0, output: 0 },
  "stepfun/step-3.5-flash:free": { input: 0, output: 0 },
  "openai/gpt-oss-120b:free": { input: 0, output: 0 },
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
  "z-ai/glm-4.5-air:free": { input: 0, output: 0 },
  "qwen/qwen3-coder:free": { input: 0, output: 0 },
  // Paid models
  "openai/gpt-5.4-mini": { input: 0.3, output: 1.2 },
};

const DEFAULT_PRICING = { input: 0.15, output: 0.6 };

/** Accumulated token usage across all LLM calls in the current action. */
let _actionTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  calls: 0,
  actualCostUsd: 0,
};

/** Reset usage tracker — call at the start of each agent action. */
export const resetUsageTracker = (): void => {
  _actionTokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    calls: 0,
    actualCostUsd: 0,
  };
};

/** Get accumulated usage for the current action. */
export const getUsageTracker = (): {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  estimatedCostUsd: number;
} => {
  return {
    inputTokens: _actionTokenUsage.inputTokens,
    outputTokens: _actionTokenUsage.outputTokens,
    calls: _actionTokenUsage.calls,
    estimatedCostUsd: _actionTokenUsage.actualCostUsd,
  };
};

export const trackUsage = (
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  },
  model?: string
): void => {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  _actionTokenUsage.inputTokens += inputTokens;
  _actionTokenUsage.outputTokens += outputTokens;
  _actionTokenUsage.calls++;

  // Calculate cost per model using known pricing
  const pricing = model
    ? (MODEL_PRICING[model] ?? DEFAULT_PRICING)
    : DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  _actionTokenUsage.actualCostUsd += inputCost + outputCost;
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

  trackUsage(result.usage, model);
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
