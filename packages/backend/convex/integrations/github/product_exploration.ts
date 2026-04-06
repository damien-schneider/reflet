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
import { stepCountIs } from "ai";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { createExplorationTools } from "./exploration_tools";
import {
  EXPLORATION_SYSTEM_PROMPT,
  extractExplorationData,
  generateTextWithFallback,
  logProgress,
  MAX_EXPLORATION_STEPS,
  MAX_TOKENS_EXPLORE,
  MAX_TOKENS_SYNTHESIZE,
  markAnalysisFailed,
  SYNTHESIS_SYSTEM_PROMPT,
  validateGitHubAccess,
} from "./product_exploration_helpers";

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
