/**
 * Agentic product exploration for repository analysis.
 *
 * Uses an AI agent with GitHub API tools to autonomously explore a repository
 * from a product manager perspective, producing rich product-focused analysis.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { MODELS } from "../../autopilot/agents/models";
import { createExplorationTools } from "./exploration_tools";

const PRODUCT_EXPLORATION_SYSTEM_PROMPT = `You are a senior product manager exploring a software product's codebase to deeply understand what it does.

Your goal: Produce a comprehensive PRODUCT analysis — what features exist, who the users are, what problems it solves, what the user experience looks like. You do NOT care about technical implementation details like frameworks or libraries.

## Exploration Strategy

1. START by reading the README and repo metadata to understand the product's purpose
2. List the root directory to understand the project shape
3. Look for route definitions (app/ folder in Next.js, pages/, routes/) to map user-facing features
4. For each major feature area, read 1-2 key files to understand what it does for users
5. Look for navigation/sidebar components to understand product structure
6. Check recent issue titles and PR titles to understand product direction and user pain points
7. Look for docs/, marketing pages, or changelog for product context

## Rules
- Focus on PRODUCT understanding: features, user flows, value proposition, target users
- Do NOT list technical stack, libraries, or architecture patterns
- When you find a feature, describe what it does for the user, not how it's implemented
- Read selectively — you don't need to read every file, just enough to understand each feature
- Be efficient — you have limited steps, prioritize breadth over depth
- If the repo is a monorepo, identify the main application and focus there

## Output Format

Write a comprehensive product analysis with these sections:
- **Product Overview**: What is this product? What problem does it solve?
- **Target Users**: Who uses this and why?
- **Core Features**: List each feature with a description of what it does for users
- **User Flows**: Key journeys users take through the product
- **Product Maturity**: How mature/complete does the product feel? What's missing?
- **Recent Product Direction**: Based on issues/PRs, where is the product heading?`;

const MAX_EXPLORATION_STEPS = 20;

/**
 * Autonomous product exploration agent.
 * Explores a connected GitHub repo using authenticated API tools
 * and produces a rich product-focused analysis.
 */
export const runProductExploration = internalAction({
  args: {
    organizationId: v.id("organizations"),
    analysisId: v.id("repoAnalysis"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.integrations.github.repo_analysis.getConnectionForAnalysis,
      { organizationId: args.organizationId }
    );

    if (!(connection?.installationId && connection.repositoryFullName)) {
      throw new Error("No GitHub connection with installation token found");
    }

    const { token } = await ctx.runAction(
      internal.integrations.github.node_actions.getInstallationTokenInternal,
      { installationId: connection.installationId }
    );

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const tools = createExplorationTools(token, connection.repositoryFullName);

    const result = await generateText({
      model: openrouter(MODELS.SMART),
      tools,
      stopWhen: stepCountIs(MAX_EXPLORATION_STEPS),
      system: PRODUCT_EXPLORATION_SYSTEM_PROMPT,
      prompt: `Explore this repository and produce a comprehensive product analysis: ${connection.repositoryFullName}`,
    });

    await ctx.runMutation(
      internal.integrations.github.repo_analysis.saveProductAnalysis,
      {
        analysisId: args.analysisId,
        productAnalysis: result.text,
      }
    );

    return null;
  },
});
