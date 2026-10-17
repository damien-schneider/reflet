import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  FAST_FULL_PRECISION_ROUTING,
  TEXT_MODEL,
  TEXT_MODEL_SETTINGS,
} from "./models";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const zeroRetentionRouting = { ...FAST_FULL_PRECISION_ROUTING, zdr: true };

export const textModel = openrouter(TEXT_MODEL, TEXT_MODEL_SETTINGS);

export const sessionAnalysisModel = openrouter(TEXT_MODEL, {
  provider: zeroRetentionRouting,
});

export const sessionLocateModel = openrouter(TEXT_MODEL, {
  ...TEXT_MODEL_SETTINGS,
  provider: zeroRetentionRouting,
});
