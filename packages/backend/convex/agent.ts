import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "./_generated/api";

// Use OpenRouter for LLM access
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const chatAgent = new Agent(components.agent, {
  name: "Chat Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions:
    "You are a helpful AI assistant. Be concise and friendly in your responses.",
});

export const feedbackClarificationAgent = new Agent(components.agent, {
  name: "Feedback Clarification Agent",
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
});

export const repoAnalysisAgent = new Agent(components.agent, {
  name: "Repository Analysis Agent",
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
// See feedback_auto_tagging.ts for the implementation
