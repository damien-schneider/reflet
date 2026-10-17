import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { z } from "zod";

const JSON_CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)```/;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// OpenRouter JSON/tool mode is unreliable: ask for raw JSON, validate with Zod.
export const generateStructured = async <T>(options: {
  maxOutputTokens?: number;
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  zdr?: boolean;
}): Promise<T> => {
  const response = await generateText({
    maxOutputTokens: options.maxOutputTokens,
    model: options.zdr
      ? openrouter(options.model, { provider: { zdr: true } })
      : openrouter(options.model),
    prompt: options.prompt,
    system: options.system,
  });

  const text = response.text.trim();

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
