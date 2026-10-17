import { generateText, type LanguageModel } from "ai";
import type { z } from "zod";

const JSON_CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)```/;

// OpenRouter JSON/tool mode is unreliable: ask for raw JSON, validate with Zod.
export const generateStructured = async <T>(options: {
  maxOutputTokens?: number;
  model: LanguageModel;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> => {
  const response = await generateText({
    maxOutputTokens: options.maxOutputTokens,
    model: options.model,
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
