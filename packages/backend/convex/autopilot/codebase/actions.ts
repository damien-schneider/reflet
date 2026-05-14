"use node";

import type { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { generateText, type LanguageModel } from "ai";
import { v } from "convex/values";
import type { Octokit } from "octokit";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { type ActionCtx, internalAction } from "../../_generated/server";
import {
  createCodebaseAgent,
  createSynthesisModel,
  DEFAULT_CODEBASE_MODEL,
  FALLBACK_CODEBASE_MODELS,
  SYNTHESIS_MODEL,
} from "./agent";
import { getInstallationOctokit } from "./octokit_helpers";
import {
  EXPLORATION_INSTRUCTIONS,
  SYNTHESIS_INSTRUCTIONS,
  SYNTHESIS_USER_PROMPT_PREFIX,
} from "./prompts";

const MAX_EXPLORATION_STEPS = 28;
const MAX_OUTPUT_TOKENS_SYNTHESIZE = 12_000;
const MIN_EVIDENCE_CHARS = 200;
const MIN_BRIEF_CHARS = 600;

interface ToolStep {
  input: unknown;
  output: unknown;
  text?: string;
  toolName: string;
}

interface CollectedEvidence {
  steps: ToolStep[];
  text: string;
}

export interface DeepAnalysisDeps {
  agentForModel: (modelId: string) => Agent;
  exploreModels: readonly string[];
  octokitFor: (ctx: ActionCtx, installationId: string) => Promise<Octokit>;
  synthesisModelFor: (modelId: string) => LanguageModel;
  synthesisModels: readonly string[];
}

const DEFAULT_SYNTHESIS_MODELS: readonly string[] = [
  SYNTHESIS_MODEL,
  "openai/gpt-5-mini",
];

const DEFAULT_DEPS: DeepAnalysisDeps = {
  agentForModel: (modelId) => createCodebaseAgent(modelId),
  exploreModels: FALLBACK_CODEBASE_MODELS,
  octokitFor: getInstallationOctokit,
  synthesisModelFor: (modelId) => createSynthesisModel(modelId),
  synthesisModels: DEFAULT_SYNTHESIS_MODELS,
};

// Transient backend errors — same model may succeed on retry.
const RETRYABLE_PATTERNS = [
  "rate limit",
  "rate-limit",
  "rate limited",
  "429",
  "500",
  "502",
  "503",
  "too many requests",
  "quota",
  "overloaded",
  "upstream",
  "service unavailable",
  "timeout",
];

// Per-model fatal errors that should NOT abort the whole pipeline — the
// next fallback model can still succeed. Model IDs can drift out of sync
// with the provider (deprecated, renamed, region-gated), and we want the
// chain to keep moving instead of dying on the first bad ID.
const FALLBACK_PATTERNS = [
  "is not a valid model",
  "invalid model",
  "no such model",
  "model not found",
  "unknown model",
  "model_not_found",
  "no allowed providers",
  "404",
];

function isModelFallbackable(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return (
    RETRYABLE_PATTERNS.some((p) => msg.includes(p)) ||
    FALLBACK_PATTERNS.some((p) => msg.includes(p))
  );
}

async function logProgress(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
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
    // best effort
  }
}

function summarizeToolStep(step: ToolStep): string {
  const inputDescriptor = (() => {
    if (typeof step.input === "string") {
      return step.input;
    }
    if (step.input && typeof step.input === "object") {
      const rec = step.input as Record<string, unknown>;
      const path = rec.path ?? rec.query ?? rec.ref;
      if (path !== undefined) {
        return String(path);
      }
    }
    return "";
  })();

  const outputText =
    typeof step.output === "string"
      ? step.output
      : JSON.stringify(step.output ?? "", null, 2);

  return `### ${step.toolName}(${inputDescriptor})\n\`\`\`\n${outputText.slice(0, 8000)}\n\`\`\``;
}

function buildEvidenceText(steps: ToolStep[]): string {
  const sections = steps
    .filter((step) => step.output !== undefined && step.output !== null)
    .map(summarizeToolStep);
  const finalNotes = steps
    .map((step) => step.text)
    .filter((text): text is string => Boolean(text?.trim()));
  const noteBlock = finalNotes.length
    ? `\n\n## Agent notes during exploration\n${finalNotes.join("\n\n")}`
    : "";
  return `${sections.join("\n\n")}${noteBlock}`;
}

function estimateCostUsd(
  input: number,
  output: number,
  modelId: string
): number {
  const rates: Record<string, { input: number; output: number }> = {
    "openai/gpt-5-mini": { input: 0.4, output: 1.6 },
    "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
    "anthropic/claude-opus-4.7": { input: 5, output: 25 },
    "google/gemini-2.5-pro": { input: 1.25, output: 5 },
  };
  const rate = rates[modelId] ?? { input: 1, output: 4 };
  return (input * rate.input + output * rate.output) / 1_000_000;
}

async function runExplorationWithFallbacks(
  ctx: ActionCtx,
  args: {
    organizationId: Id<"organizations">;
    runId: string;
    requestContext: RequestContext;
    repoFullName: string;
  },
  deps: DeepAnalysisDeps
): Promise<{
  evidence: CollectedEvidence;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const collectedSteps: ToolStep[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let lastError: unknown;

  for (const modelId of deps.exploreModels) {
    const agent = deps.agentForModel(modelId);
    try {
      const result = await agent.generate(
        `Explore the repository "${args.repoFullName}" thoroughly. Follow the mandatory exploration order in the instructions. Read full files for README, AGENTS.md/CLAUDE.md, package manifests, landing/pricing pages, and primary route/page files. Capture enough evidence for a marketing-ready product brief.`,
        {
          requestContext: args.requestContext,
          maxSteps: MAX_EXPLORATION_STEPS,
          instructions: EXPLORATION_INSTRUCTIONS,
          onStepFinish: async (event) => {
            const usage = event.usage;
            inputTokens += usage?.inputTokens ?? 0;
            outputTokens += usage?.outputTokens ?? 0;

            const calls = event.toolCalls ?? [];
            const results = event.toolResults ?? [];

            for (const call of calls) {
              const callId = call.payload.toolCallId;
              const matched = results.find(
                (r) => r.payload.toolCallId === callId
              );
              collectedSteps.push({
                toolName: call.payload.toolName,
                input: call.payload.args,
                output: matched?.payload.result,
                text: event.text || undefined,
              });
            }

            if (calls.length > 0) {
              await ctx.runMutation(
                internal.autopilot.codebase.mutations.incrementToolCallCount,
                {
                  runId: args.runId as never,
                  delta: calls.length,
                }
              );
              const summary = calls
                .map((c) => {
                  const input = (c.payload.args ?? {}) as Record<
                    string,
                    unknown
                  >;
                  const detail = input.path ?? input.query ?? input.ref ?? "";
                  return `${c.payload.toolName}(${String(detail)})`;
                })
                .join(", ");
              await logProgress(
                ctx,
                args.organizationId,
                "info",
                `Reading: ${summary}`
              );
            }
          },
        }
      );

      if (result?.text) {
        collectedSteps.push({
          toolName: "_final_notes",
          input: null,
          output: null,
          text: result.text,
        });
      }

      return {
        evidence: {
          text: buildEvidenceText(collectedSteps),
          steps: collectedSteps,
        },
        modelUsed: modelId,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      lastError = error;
      if (!isModelFallbackable(error)) {
        throw error;
      }
      await logProgress(
        ctx,
        args.organizationId,
        "warning",
        `Exploration model ${modelId} failed, falling back to next model`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (collectedSteps.length > 0) {
    return {
      evidence: {
        text: buildEvidenceText(collectedSteps),
        steps: collectedSteps,
      },
      modelUsed: DEFAULT_CODEBASE_MODEL,
      inputTokens,
      outputTokens,
    };
  }

  throw lastError ?? new Error("Exploration failed across all fallback models");
}

async function runSynthesis(
  ctx: ActionCtx,
  args: {
    organizationId: Id<"organizations">;
    repoFullName: string;
    evidence: string;
  },
  deps: DeepAnalysisDeps
): Promise<{
  text: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}> {
  let lastError: unknown;

  for (const modelId of deps.synthesisModels) {
    try {
      const result = await generateText({
        model: deps.synthesisModelFor(modelId),
        system: SYNTHESIS_INSTRUCTIONS,
        prompt: `${SYNTHESIS_USER_PROMPT_PREFIX}

Repository: "${args.repoFullName}"

---

${args.evidence}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS_SYNTHESIZE,
      });

      return {
        text: result.text,
        modelUsed: modelId,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };
    } catch (error) {
      lastError = error;
      if (!isModelFallbackable(error)) {
        throw error;
      }
      await logProgress(
        ctx,
        args.organizationId,
        "warning",
        `Synthesis model ${modelId} failed, falling back to next model`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  throw lastError ?? new Error("Synthesis failed across all fallback models");
}

export async function runDeepAnalysisCore(
  ctx: ActionCtx,
  args: {
    organizationId: Id<"organizations">;
    analysisId: Id<"repoAnalysis">;
  },
  overrides?: Partial<DeepAnalysisDeps>
): Promise<null> {
  const deps: DeepAnalysisDeps = { ...DEFAULT_DEPS, ...overrides };

  await ctx.runMutation(
    internal.integrations.github.repo_analysis.updateAnalysisStatus,
    { analysisId: args.analysisId, status: "in_progress" }
  );

  const connection = await ctx.runQuery(
    internal.integrations.github.repo_analysis.getConnectionForAnalysis,
    { organizationId: args.organizationId }
  );

  if (!(connection?.repositoryFullName && connection.installationId)) {
    const msg = "No GitHub connection or installation ID available";
    await logProgress(ctx, args.organizationId, "error", msg);
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      {
        analysisId: args.analysisId,
        status: "error",
        error: msg,
      }
    );
    return null;
  }

  const repoFullName = connection.repositoryFullName;
  const installationId = connection.installationId;

  const runId = await ctx.runMutation(
    internal.autopilot.codebase.mutations.startAgentRun,
    {
      organizationId: args.organizationId,
      repoFullName,
      purpose: "deep_analysis",
    }
  );

  try {
    const octokit = await deps.octokitFor(ctx, installationId);

    const requestContext = new RequestContext();
    requestContext.set("codebase", {
      ctx,
      octokit,
      installationId,
      repoFullName,
    });

    await logProgress(
      ctx,
      args.organizationId,
      "action",
      `Phase 1/2 — Exploring ${repoFullName} with Mastra agent`
    );

    const exploration = await runExplorationWithFallbacks(
      ctx,
      {
        organizationId: args.organizationId,
        runId,
        requestContext,
        repoFullName,
      },
      deps
    );

    if (exploration.evidence.text.length < MIN_EVIDENCE_CHARS) {
      const msg = `Exploration gathered insufficient evidence (${exploration.evidence.text.length} chars)`;
      await logProgress(ctx, args.organizationId, "error", msg);
      await ctx.runMutation(
        internal.autopilot.codebase.mutations.failAgentRun,
        { runId, error: msg }
      );
      await ctx.runMutation(
        internal.integrations.github.repo_analysis.updateAnalysisStatus,
        {
          analysisId: args.analysisId,
          status: "error",
          error: msg,
        }
      );
      return null;
    }

    await logProgress(
      ctx,
      args.organizationId,
      "success",
      `Phase 1 complete — ${exploration.evidence.steps.length} tool calls, ${exploration.evidence.text.length} chars of evidence`
    );

    await logProgress(
      ctx,
      args.organizationId,
      "action",
      "Phase 2/2 — Synthesizing marketing-ready product brief"
    );

    const synthesis = await runSynthesis(
      ctx,
      {
        organizationId: args.organizationId,
        repoFullName,
        evidence: exploration.evidence.text,
      },
      deps
    );

    const brief = synthesis.text.trim();

    if (brief.length < MIN_BRIEF_CHARS) {
      const msg = `Synthesis output too short (${brief.length} chars)`;
      await logProgress(ctx, args.organizationId, "error", msg);
      await ctx.runMutation(
        internal.autopilot.codebase.mutations.failAgentRun,
        { runId, error: msg }
      );
      await ctx.runMutation(
        internal.integrations.github.repo_analysis.updateAnalysisStatus,
        {
          analysisId: args.analysisId,
          status: "error",
          error: msg,
        }
      );
      return null;
    }

    const totalInput = exploration.inputTokens + synthesis.inputTokens;
    const totalOutput = exploration.outputTokens + synthesis.outputTokens;
    const costUsd =
      estimateCostUsd(
        exploration.inputTokens,
        exploration.outputTokens,
        exploration.modelUsed
      ) +
      estimateCostUsd(
        synthesis.inputTokens,
        synthesis.outputTokens,
        synthesis.modelUsed
      );

    await ctx.runMutation(
      internal.autopilot.codebase.mutations.completeAgentRun,
      {
        runId,
        assistantText: brief,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        costUsd,
      }
    );

    await ctx.runMutation(
      internal.integrations.github.repo_analysis.saveProductAnalysis,
      { analysisId: args.analysisId, productAnalysis: brief }
    );

    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      { analysisId: args.analysisId, status: "completed" }
    );

    await logProgress(
      ctx,
      args.organizationId,
      "success",
      `Deep analysis complete — ${brief.length} chars, ~$${costUsd.toFixed(3)}`,
      `${brief.slice(0, 280)}…`
    );

    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.company_brief.generateCompanyBrief,
      { organizationId: args.organizationId }
    );

    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logProgress(
      ctx,
      args.organizationId,
      "error",
      `Deep analysis failed: ${msg}`
    );
    await ctx.runMutation(internal.autopilot.codebase.mutations.failAgentRun, {
      runId,
      error: msg,
    });
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      {
        analysisId: args.analysisId,
        status: "error",
        error: `Deep analysis failed: ${msg}`,
      }
    );
    return null;
  }
}

export const runDeepAnalysis = internalAction({
  args: {
    organizationId: v.id("organizations"),
    analysisId: v.id("repoAnalysis"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await runDeepAnalysisCore(ctx, args);
    return null;
  },
});
