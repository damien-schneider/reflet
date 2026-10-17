import { generateText } from "ai";
import { textModel } from "../../ai/openrouter";
import {
  buildReleaseNotesPrompt,
  buildReleaseTitlePrompt,
  type ReleaseNotesPromptInput,
} from "../ai/prompts";

export async function generateWithAssistant(prompt: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }
  const result = await generateText({
    model: textModel,
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
