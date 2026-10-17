import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { TEXT_MODEL, TEXT_MODEL_SETTINGS } from "./models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const textModel = openrouter(TEXT_MODEL, TEXT_MODEL_SETTINGS);

export const sessionAnalysisModel = openrouter(TEXT_MODEL, {
  ...TEXT_MODEL_SETTINGS,
  provider: { zdr: true },
});
