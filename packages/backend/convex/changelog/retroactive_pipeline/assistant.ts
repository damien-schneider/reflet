import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { RELEASE_ASSISTANT_MODEL } from "../ai/models";
import {
  buildReleaseNotesPrompt,
  buildReleaseTitlePrompt,
  type ReleaseNotesPromptInput,
} from "../ai/prompts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateWithAssistant(prompt: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }
  const result = await generateText({
    model: openrouter(RELEASE_ASSISTANT_MODEL),
    prompt,
  });
  return result.text.trim();
}

export async function generateReleaseProse(
  input: ReleaseNotesPromptInput
): Promise<{ description: string; title: string }> {
  const description = await generateWithAssistant(
    buildReleaseNotesPrompt(input)
  );
  const title = await generateWithAssistant(
    buildReleaseTitlePrompt({ description, version: input.version })
  );
  return { description, title };
}
