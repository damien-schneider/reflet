/**
 * CEO coordination skill definition backed by the Convex AI runtime component.
 */

import { Agent as ConvexAiRuntime } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components } from "../../../_generated/api";
import { env } from "../../../shared/env";
import { MODELS, QUALITY_MODELS } from "../models";
import { buildRoleSkillPrompt, CEO_SYSTEM_PROMPT } from "../prompts";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const CEO_MODELS = QUALITY_MODELS;

export const ceoSkillRuntime = new ConvexAiRuntime(components.aiRuntime, {
  name: "CEO coordination skill",
  languageModel: openrouter(MODELS.SMART),
  instructions: buildRoleSkillPrompt(CEO_SYSTEM_PROMPT, "", ""),
  maxSteps: 5,
});
