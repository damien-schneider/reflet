import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { z } from "zod";

// Regex to extract JSON from markdown code blocks
const JSON_CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)```/;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Generate structured output via OpenRouter using plain text mode.
 *
 * OpenRouter doesn't reliably support tool-call / JSON-mode structured outputs,
 * so we ask the model to return raw JSON and validate with Zod ourselves.
 *
 * Callers should include JSON format instructions in the system or user prompt
 * (e.g. "Respond with ONLY valid JSON matching: { ... }").
 */
export const generateStructured = async <T>(options: {
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> => {
  const response = await generateText({
    model: openrouter(options.model),
    system: options.system,
    prompt: options.prompt,
  });

  const text = response.text.trim();

  // Try raw JSON first, then try extracting from markdown code block
  const jsonString =
    text.startsWith("{") || text.startsWith("[")
      ? text
      : text.match(JSON_CODE_BLOCK_REGEX)?.[1]?.trim();

  if (!jsonString) {
    throw new Error(
      `AI response was not valid JSON (first 200 chars): ${text.slice(0, 200)}`
    );
  }

  const parsed: unknown = JSON.parse(jsonString);
  return options.schema.parse(parsed);
};

/**
 * Try generateStructured with each model in order until one succeeds.
 */
export const generateStructuredWithFallback = async <T>(options: {
  models: readonly string[];
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> => {
  let lastError: unknown;
  for (const modelId of options.models) {
    try {
      return await generateStructured({
        model: modelId,
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
      });
    } catch (error) {
      console.warn(
        `[intelligence] Structured generation with ${modelId} failed: ${error instanceof Error ? error.message : error}`
      );
      lastError = error;
    }
  }
  throw lastError;
};
