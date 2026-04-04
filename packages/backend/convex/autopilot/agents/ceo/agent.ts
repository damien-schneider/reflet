/**
 * CEO Agent definition — @convex-dev/agent instance for thread-based chat.
 */

import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components } from "../../../_generated/api";
import { MODELS } from "../models";
import { buildAgentPrompt, CEO_SYSTEM_PROMPT } from "../prompts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const CEO_MODELS = [MODELS.SMART, MODELS.FAST] as const;

export const ceoAgent = new Agent(components.agent, {
  name: "CEO Agent",
  languageModel: openrouter(MODELS.SMART),
  instructions: buildAgentPrompt(CEO_SYSTEM_PROMPT, "", ""),
  maxSteps: 5,
});
