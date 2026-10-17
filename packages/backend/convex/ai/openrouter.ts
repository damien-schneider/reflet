import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { REASONING_OFF, SESSION_ANALYSIS_MODEL, TEXT_MODEL } from "./models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const textModel = openrouter(TEXT_MODEL, REASONING_OFF);

export const sessionAnalysisModel = openrouter(SESSION_ANALYSIS_MODEL, {
  ...REASONING_OFF,
  provider: { zdr: true },
});
