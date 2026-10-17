import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "../_generated/api";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const feedbackClarificationAgent = new Agent(components.agent, {
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
  languageModel: openrouter("z-ai/glm-4.5-air:free"),
  name: "Feedback Clarification Agent",
});
