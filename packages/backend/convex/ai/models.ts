import type { OpenRouterChatSettings } from "@openrouter/ai-sdk-provider";

export const TEXT_MODEL = "deepseek/deepseek-v4.1-flash-1017";
export const EVALUATION_MODEL = "jev-1.13";
export const TRANSCRIPTION_MODEL = "elevenlabs/scribe-v2";
export const SPEAKER_DETECTION_MODEL = "voxtral-mini-transcribe-realtime-3";

export const FAST_FULL_PRECISION_ROUTING = {
  quantizations: ["fp8", "bf16", "fp16", "unknown"],
  sort: "throughput",
} satisfies OpenRouterChatSettings["provider"];

export const TEXT_MODEL_SETTINGS = {
  provider: FAST_FULL_PRECISION_ROUTING,
  reasoning: { effort: "none" },
} satisfies OpenRouterChatSettings;
