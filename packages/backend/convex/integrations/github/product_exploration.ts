/**
 * Agentic product exploration for repository analysis.
 *
 * Two-phase approach:
 * 1. EXPLORE: AI agent uses GitHub tools to read the codebase (gather phase)
 * 2. SYNTHESIZE: Feed all gathered data to the LLM to write the analysis
 *
 * This avoids the AI SDK v6 issue where stopWhen cuts off during tool calls
 * and result.text is empty.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { FREE_MODEL_FALLBACKS } from "../../autopilot/agents/models";
import { createExplorationTools } from "./exploration_tools";

const GITHUB_API_URL = "https://api.github.com";

const EXPLORATION_SYSTEM_PROMPT = `You are a senior product manager exploring a codebase. Your ONLY job right now is to READ and GATHER information using the tools provided. Do NOT write a final analysis yet — just explore thoroughly.

## Exploration Strategy (follow this order)

1. Read the README and get repo metadata
2. List the root directory to understand the project shape
3. If it's a monorepo, find the main app directory
4. Find and list route/page definitions (Next.js app/ folder, pages/, routes/)
5. For EVERY major feature area: list its directory, read 1-2 key page/component files
6. Find navigation/sidebar components to understand product structure
7. Look for landing pages, marketing copy, pricing pages, and comparison pages
8. Search for pricing tiers, plan names, feature gates, and subscription logic
9. Search for user-facing strings and onboarding flows
10. Check recent issue and PR titles
11. Check for docs, changelog, release notes

## Rules
- Use ALL your available tool calls — explore as many files as possible
- Read route/page files to understand features
- When you find a feature directory, list it and read key files inside
- Focus on understanding WHAT the product does for users, not technical details
- Pay special attention to: pricing/plans, feature names as shown in the UI, navigation labels, onboarding steps, and any taglines or marketing copy
- After exploring, write a brief summary of what you found (the detailed analysis comes later)`;

const SYNTHESIS_SYSTEM_PROMPT = `You are a senior product manager writing the definitive product brief. This document is the single source of truth about what the product IS — used by other AI agents (growth, sales, PM, support) to understand the product deeply. Be thorough and factual.

## Output Rules
- Be as long as needed to cover every feature and aspect of the product. Do NOT cut corners — list everything.
- Use rich markdown: headers, bullet points, **bold** for key terms.
- Only describe what ACTUALLY EXISTS in the codebase. Never speculate about future features, gaps, strategy, or roadmap.
- Focus on USER value, not technical implementation. Do NOT mention frameworks, libraries, or architecture.
- Use the product's actual name, actual feature names, and actual UI labels as found in the code.
- No fluff, no filler sentences. Every sentence should carry a fact about the product.

## What to include
- The product identity: name, what it does, who it's for, how it's positioned
- The brand voice and tone: is the copy playful, professional, technical, casual? Quote actual taglines and marketing copy found in the codebase.
- Every feature area with what it does for users
- Pricing and plans if they exist
- The user model: accounts, teams, orgs, roles, permissions

## What NOT to include
- Technical stack, architecture, or implementation details (the CTO agent handles this)
- Market analysis, competitive strategy, or growth suggestions (the growth agent handles this)
- Maturity assessments, gaps, or roadmap speculation
- Recommendations or opinions

## Structure

# {Product Name}
**Tagline:** The product's actual tagline or a one-sentence description derived from its marketing copy.

**What it does:** Explain the core product in plain language.

**Who it's for:** The target audience — roles, company sizes, use cases.

**How it's sold:** B2B/B2C/both? Free/freemium/paid? If pricing tiers or plans exist, list them with what each includes.

# Brand & Tone
What is the product's voice? Quote actual copy from landing pages, onboarding, or UI. Is it formal, casual, playful, developer-focused, enterprise? What words and phrases does the product use to describe itself?

# Features
List ALL feature areas found in the product. For each:

## {Feature Name}
What it does for users.
- Capability or sub-feature
- (list all that actually exist)

Group related features logically. Use the product's actual navigation sections and labels where possible. Be exhaustive — if a feature exists in the codebase, it belongs here.

# User Model
How do accounts work? Are there teams, organizations, workspaces? What roles or permission levels exist? Is there an onboarding flow? What does a new user see first?

# Key User Flows
Describe the most important journeys as numbered steps:
1. Step one
2. Step two
3. Step three`;

const MAX_EXPLORATION_STEPS = 20;
const MAX_TOKENS_EXPLORE = 8000;
const MAX_TOKENS_SYNTHESIZE = 8000;

const RATE_LIMIT_PATTERNS = [
  "rate-limit",
  "rate limit",
  "rate increased",
  "temporarily",
  "429",
  "too many requests",
  "quota",
  "overloaded",
  "upstream error",
  "non-retryable",
  "failed after",
  "throttl",
];

function isRateLimitError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return RATE_LIMIT_PATTERNS.some((pattern) => msg.includes(pattern));
}

/**
 * Wrapper around generateText that retries with fallback free models on rate-limit errors.
 */
async function generateTextWithFallback(
  buildOptions: (modelId: string) => Parameters<typeof generateText>[0],
  onFallback?: (modelId: string) => Promise<void>
) {
  let lastError: unknown;

  for (const modelId of FREE_MODEL_FALLBACKS) {
    try {
      return await generateText(buildOptions(modelId));
    } catch (error) {
      lastError = error;
      if (isRateLimitError(error)) {
        await onFallback?.(modelId);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Validate GitHub token by making a test API call.
 */
async function validateGitHubAccess(
  token: string,
  repo: string
): Promise<string> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API access failed for ${repo}: HTTP ${response.status} — ${body}`
    );
  }

  const data = (await response.json()) as {
    full_name: string;
    description?: string;
  };
  return data.description ?? data.full_name;
}

/**
 * Log exploration progress to autopilotActivityLog.
 */
async function logProgress(
  // biome-ignore lint/suspicious/noExplicitAny: ActionCtx type varies by runtime
  ctx: any,
  organizationId: string,
  level: "info" | "action" | "success" | "warning" | "error",
  message: string,
  details?: string
): Promise<void> {
  try {
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "system",
      level,
      message,
      details,
    });
  } catch {
    // Don't let logging failures break the exploration
  }
}

/**
 * Extract all tool call results from the exploration steps.
 * This gives us the raw data the agent gathered.
 */
function extractExplorationData(
  steps: Array<{
    toolResults: Array<{
      toolName: string;
      output: unknown;
      input: unknown;
    }>;
    text: string;
  }>
): string {
  const sections: string[] = [];

  for (const step of steps) {
    for (const toolResult of step.toolResults) {
      const input = toolResult.input as Record<string, unknown>;
      const toolInput = input.path ?? input.query ?? "";
      const toolOutput =
        typeof toolResult.output === "string"
          ? toolResult.output
          : JSON.stringify(toolResult.output);

      // Skip empty or error results
      if (
        !toolOutput ||
        toolOutput.startsWith("Failed to") ||
        toolOutput === "No results found"
      ) {
        continue;
      }

      sections.push(
        `### ${toolResult.toolName}(${String(toolInput)})\n\`\`\`\n${toolOutput.slice(0, 4000)}\n\`\`\``
      );
    }

    // Also capture any text the model wrote between tool calls
    if (step.text.trim()) {
      sections.push(`### Agent Notes\n${step.text}`);
    }
  }

  return sections.join("\n\n");
}

/**
 * Mark the analysis as failed.
 */
// biome-ignore lint/suspicious/noExplicitAny: ActionCtx type varies
async function markAnalysisFailed(ctx: any, analysisId: string, error: string) {
  try {
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      { analysisId, status: "error", error }
    );
  } catch {
    // Best effort
  }
}

/**
 * Autonomous product exploration agent.
 * Phase 1: Explore the repo with tools. Phase 2: Synthesize into product analysis.
 */
export const runProductExploration = internalAction({
  args: {
    organizationId: v.id("organizations"),
    analysisId: v.id("repoAnalysis"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Step 1: Get GitHub connection
    const connection = await ctx.runQuery(
      internal.integrations.github.repo_analysis.getConnectionForAnalysis,
      { organizationId: args.organizationId }
    );

    if (!connection?.repositoryFullName) {
      const msg = "No GitHub repository connected";
      await logProgress(
        ctx,
        args.organizationId,
        "error",
        `Product exploration failed: ${msg}`
      );
      await markAnalysisFailed(ctx, args.analysisId, msg);
      return null;
    }

    if (!connection.installationId) {
      const msg = "No GitHub App installation ID";
      await logProgress(
        ctx,
        args.organizationId,
        "error",
        `Product exploration failed: ${msg}`
      );
      await markAnalysisFailed(ctx, args.analysisId, msg);
      return null;
    }

    const repo = connection.repositoryFullName;

    // Step 2: Get installation token
    let token: string;
    try {
      const tokenResult = await ctx.runAction(
        internal.integrations.github.node_actions.getInstallationTokenInternal,
        { installationId: connection.installationId }
      );
      token = tokenResult.token;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await logProgress(
        ctx,
        args.organizationId,
        "error",
        `Could not get GitHub token — ${msg}`
      );
      await markAnalysisFailed(
        ctx,
        args.analysisId,
        `GitHub token error: ${msg}`
      );
      return null;
    }

    // Step 3: Validate token works
    try {
      const repoDesc = await validateGitHubAccess(token, repo);
      await logProgress(
        ctx,
        args.organizationId,
        "action",
        `Starting deep product exploration of ${repo}`,
        repoDesc
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await logProgress(
        ctx,
        args.organizationId,
        "error",
        `Cannot access repository ${repo} — ${msg}`
      );
      await markAnalysisFailed(
        ctx,
        args.analysisId,
        `Repository access error: ${msg}`
      );
      return null;
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // =========================================
    // PHASE 1: EXPLORE (gather data with tools)
    // =========================================
    let explorationData: string;
    {
      await logProgress(
        ctx,
        args.organizationId,
        "action",
        "Phase 1: Exploring codebase with AI agent..."
      );

      const tools = createExplorationTools(token, repo);

      // Collect steps incrementally so we keep partial data if exploration errors mid-way
      const collectedSteps: Array<{
        toolResults: Array<{
          toolName: string;
          output: unknown;
          input: unknown;
        }>;
        text: string;
      }> = [];

      let explorationError: string | undefined;

      try {
        await generateTextWithFallback(
          (modelId) => ({
            model: openrouter(modelId),
            tools,
            maxOutputTokens: MAX_TOKENS_EXPLORE,
            stopWhen: stepCountIs(MAX_EXPLORATION_STEPS),
            system: EXPLORATION_SYSTEM_PROMPT,
            prompt: `Explore the repository "${repo}". Read as many files as possible to understand every feature. Start with the README, then list directories, then read route/page files to understand features.`,
            // biome-ignore lint/suspicious/noExplicitAny: AI SDK onStepFinish types are complex generics
            onStepFinish: async (step: any) => {
              collectedSteps.push({
                toolResults: step.toolResults ?? [],
                text: step.text ?? "",
              });
              const toolCalls = (step.toolCalls ?? []) as Array<{
                toolName: string;
                input: unknown;
              }>;
              if (toolCalls.length > 0) {
                const details = toolCalls
                  .map((tc) => {
                    const input = tc.input as Record<string, unknown>;
                    const detail = input.path ?? input.query ?? "";
                    return `${tc.toolName}(${String(detail)})`;
                  })
                  .join(", ");
                await logProgress(
                  ctx,
                  args.organizationId,
                  "info",
                  `Reading: ${details}`
                );
              }
            },
          }),
          async (failedModel) => {
            await logProgress(
              ctx,
              args.organizationId,
              "warning",
              `Model ${failedModel} rate-limited, trying next fallback...`
            );
          }
        );
      } catch (error) {
        explorationError =
          error instanceof Error ? error.message : String(error);
      }

      // Extract whatever data we gathered (full run or partial before error)
      explorationData = extractExplorationData(collectedSteps);

      if (explorationError) {
        await logProgress(
          ctx,
          args.organizationId,
          "warning",
          `Phase 1 error: ${explorationError}`,
          `Gathered ${collectedSteps.length} steps / ${explorationData.length} chars before failure`
        );
      } else {
        await logProgress(
          ctx,
          args.organizationId,
          "success",
          `Phase 1 complete: ${collectedSteps.length} steps, ${explorationData.length} chars of data`
        );
      }

      if (explorationData.length < 100) {
        const msg = explorationError
          ? `Phase 1 failed and gathered insufficient data: ${explorationError}`
          : "Exploration gathered insufficient data — tools may have returned errors";
        await logProgress(
          ctx,
          args.organizationId,
          "error",
          msg,
          `Raw data: ${explorationData.slice(0, 500)}`
        );
        await markAnalysisFailed(ctx, args.analysisId, msg);
        return null;
      }
    }

    // =============================================
    // PHASE 2: SYNTHESIZE (write the analysis)
    // =============================================
    try {
      await logProgress(
        ctx,
        args.organizationId,
        "action",
        "Phase 2: Writing product analysis from exploration data..."
      );

      const synthesisResult = await generateTextWithFallback(
        (modelId) => ({
          model: openrouter(modelId),
          maxOutputTokens: MAX_TOKENS_SYNTHESIZE,
          system: SYNTHESIS_SYSTEM_PROMPT,
          prompt: `Here is all the data gathered from exploring the "${repo}" codebase. Write a comprehensive product analysis based on this data.\n\n---\n\n${explorationData}`,
        }),
        async (failedModel) => {
          await logProgress(
            ctx,
            args.organizationId,
            "warning",
            `Model ${failedModel} rate-limited, trying next fallback...`
          );
        }
      );

      const analysis = synthesisResult.text.trim();

      if (analysis.length < 200) {
        const msg = "Phase 2 produced insufficient analysis";
        await logProgress(
          ctx,
          args.organizationId,
          "error",
          msg,
          `Output: ${analysis.slice(0, 500)}`
        );
        await markAnalysisFailed(ctx, args.analysisId, msg);
        return null;
      }

      // Save the analysis and mark as completed
      await ctx.runMutation(
        internal.integrations.github.repo_analysis.saveProductAnalysis,
        { analysisId: args.analysisId, productAnalysis: analysis }
      );

      await ctx.runMutation(
        internal.integrations.github.repo_analysis.updateAnalysisStatus,
        { analysisId: args.analysisId, status: "completed" }
      );

      await logProgress(
        ctx,
        args.organizationId,
        "success",
        `Product analysis complete — ${analysis.length} chars`,
        `${analysis.slice(0, 200)}…`
      );

      // Generate the product definition knowledge doc
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.company_brief.generateCompanyBrief,
        { organizationId: args.organizationId }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await logProgress(
        ctx,
        args.organizationId,
        "error",
        `Phase 2 failed: ${msg}`
      );
      await markAnalysisFailed(ctx, args.analysisId, `Phase 2 failed: ${msg}`);
    }

    return null;
  },
});
