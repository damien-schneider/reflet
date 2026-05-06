/**
 * Helpers for agentic product exploration: prompts, constants, and utilities.
 */

import { generateText } from "ai";
import { internal } from "../../_generated/api";
import { FAST_MODELS } from "../../autopilot/agents/models";

export const GITHUB_API_URL = "https://api.github.com";

export const EXPLORATION_SYSTEM_PROMPT = `You are a senior product manager exploring a codebase. Your ONLY job right now is to READ and GATHER information using the tools provided. Do NOT write a final analysis yet — just explore thoroughly.

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

export const SYNTHESIS_SYSTEM_PROMPT = `You are a senior product manager writing the definitive product brief. This document is the single source of truth about what the product IS — used by other AI agents (growth, sales, PM, support) to understand the product deeply. Be thorough and factual.

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

export const MAX_EXPLORATION_STEPS = 20;
export const MAX_TOKENS_EXPLORE = 8000;
export const MAX_TOKENS_SYNTHESIZE = 8000;

const RETRYABLE_ERROR_PATTERNS = [
  "rate-limit",
  "rate limit",
  "rate increased",
  "temporarily",
  "429",
  "500",
  "502",
  "503",
  "too many requests",
  "quota",
  "overloaded",
  "upstream error",
  "internal server error",
  "bad gateway",
  "service unavailable",
  "non-retryable",
  "failed after",
  "throttl",
  "deprecated",
  "has been deprecated",
];

export function isRetryableError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

/**
 * Wrapper around generateText that retries with fallback free models on rate-limit errors.
 */
export async function generateTextWithFallback(
  buildOptions: (modelId: string) => Parameters<typeof generateText>[0],
  onFallback?: (modelId: string) => Promise<void>
) {
  let lastError: unknown;

  for (const modelId of FAST_MODELS) {
    try {
      return await generateText(buildOptions(modelId));
    } catch (error) {
      lastError = error;
      if (isRetryableError(error)) {
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
export async function validateGitHubAccess(
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
export async function logProgress(
  // biome-ignore lint/suspicious/noExplicitAny: ActionCtx type varies by runtime
  ctx: any,
  organizationId: string,
  level: "info" | "action" | "success" | "warning" | "error",
  message: string,
  details?: string
): Promise<void> {
  try {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
export function extractExplorationData(
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
export async function markAnalysisFailed(
  // biome-ignore lint/suspicious/noExplicitAny: ActionCtx type varies
  ctx: any,
  analysisId: string,
  error: string
) {
  try {
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      { analysisId, status: "error", error }
    );
  } catch {
    // Best effort
  }
}
