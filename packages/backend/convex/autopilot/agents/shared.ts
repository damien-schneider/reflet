/**
 * Shared AI generation utilities for autopilot agents.
 *
 * Provides a single generateObjectWithFallback implementation
 * that all agents use instead of duplicating the retry logic.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import type { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const RETRY_MAX_OUTPUT_TOKENS = 2048;

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
