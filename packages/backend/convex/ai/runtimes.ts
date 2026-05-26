import { Agent as ConvexAiRuntime } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "../_generated/api";
import { env } from "../shared/env";

// Use OpenRouter for LLM access
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const chatRuntime = new ConvexAiRuntime(components.aiRuntime, {
  name: "Chat runtime",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions:
    "You are a helpful AI assistant. Be concise and friendly in your responses.",
});

export const feedbackClarificationRuntime = new ConvexAiRuntime(
  components.aiRuntime,
  {
    name: "Feedback clarification runtime",
    languageModel: openrouter("z-ai/glm-4.5-air:free"),
    instructions: `You are an expert at understanding and clarifying user feedback for software products.
Your job is to take raw user feedback and rephrase it to be:
1. More detailed and specific
2. Clearer in expressing the user's intent and pain points
3. Actionable for the development team
4. Professional in tone while preserving the user's voice

When clarifying feedback:
- Identify the core problem or feature request
- Add context about why this matters to the user
- Suggest potential use cases or scenarios
- Keep the original intent intact
- Format the response in clear sections if needed`,
  }
);

export const repoAnalysisRuntime = new ConvexAiRuntime(components.aiRuntime, {
  name: "Repository analysis runtime",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are an expert software architect analyzing codebases.
Your job is to analyze a GitHub repository and provide:

1. **Summary**: A brief overview of what the project does
2. **Tech Stack**: The main technologies, frameworks, and libraries used
3. **Architecture**: The overall structure and design patterns
4. **Features**: Key features and capabilities of the project
5. **Repository Structure**: The organization of the codebase

Be thorough but concise. Focus on actionable insights that would help someone understand the project quickly.`,
});

// Note: Auto-tagging now uses AI SDK directly with structured output (generateObject)
// See auto_tagging_actions.ts for the implementation
