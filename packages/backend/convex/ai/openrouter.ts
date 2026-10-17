import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  SESSION_ANALYSIS_MODEL,
  TEXT_MODEL,
  TEXT_MODEL_SETTINGS,
} from "./models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const textModel = openrouter(TEXT_MODEL, TEXT_MODEL_SETTINGS);

export const sessionAnalysisModel = openrouter(SESSION_ANALYSIS_MODEL, {
  provider: { zdr: true },
});
