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
  let lastError: unknown;

  for (const model of models) {
    try {
      const result = await generateObject({
        model: openrouter(model),
        schema,
        prompt,
        system: systemPrompt,
        temperature,
        maxTokens: maxOutputTokens,
      });

      return result.object as z.infer<T>;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `All models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
};
