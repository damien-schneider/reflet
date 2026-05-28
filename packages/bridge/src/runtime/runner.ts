import type { HarnessRecipe } from "@reflet/harness";
import { DEFAULT_HARNESS_RECIPES } from "@reflet/harness";
import { runDoctor } from "./doctor";
import {
  buildClaudeCommand,
  buildClaudeRecipePrompt,
  hashText,
  parseClaudeSessionId,
} from "./prompt";
import type { BridgeApi } from "./types";
import { validateHarnessArtifacts } from "./validation";
import {
  assertRemoteBranchPushed,
  buildWorktreePlan,
  createWorktree,
  findDraftPrUrl,
  readHeadSha,
  runCommand,
} from "./worktree";

export type BridgeRunOnceResult =
  | { kind: "blocked"; reason: string }
  | { kind: "completed" }
  | { kind: "idle" };

const CLAUDE_COMMAND_TIMEOUT_MS = 15 * 60 * 1000;

export interface BridgeRunInput {
  api: BridgeApi;
  bridgeName: string;
  env?: Record<string, string>;
  repoFullName: string;
  repoPath: string;
}

function findRecipe(recipeId: string): HarnessRecipe {
  const recipe = DEFAULT_HARNESS_RECIPES.find(
    (candidate) => candidate.id === recipeId
  );
  if (!recipe) {
    throw new Error(`Unknown harness recipe: ${recipeId}`);
  }
  return recipe;
}

async function failJob(
  api: BridgeApi,
  jobId: string,
  startedAt: number,
  reason: string
): Promise<BridgeRunOnceResult> {
  await api.failJob({
    blockerMessage: reason,
    failureReason: reason,
    jobId,
    runtimeMs: Date.now() - startedAt,
  });
  return { kind: "blocked", reason };
}

export async function runBridgeOnce({
  api,
  bridgeName,
  env,
  repoFullName,
  repoPath,
}: BridgeRunInput): Promise<BridgeRunOnceResult> {
  const doctor = runDoctor(repoPath, env);
  const registration = await api.register({
    bridgeName,
    claudeAvailable: doctor.claudeCodeAvailable,
    doctorChecks: doctor.checks,
    repoFullName,
  });
  await api.heartbeat({
    bridgeInstallationId: registration.bridgeInstallationId,
    bridgeName,
    claudeAvailable: doctor.claudeCodeAvailable,
    doctorChecks: doctor.checks,
    repoFullName,
  });
  if (!doctor.ready) {
    return { kind: "blocked", reason: "doctor_failed" };
  }

  const claim = await api.claimJob({
    bridgeInstallationId: registration.bridgeInstallationId,
    repoFullName,
  });
  if (!claim.job) {
    return { kind: "idle" };
  }

  const startedAt = Date.now();
  await api.appendEvent({
    jobId: claim.job.id,
    level: "action",
    message: `Claimed ${claim.job.title}`,
  });

  const recipe = findRecipe(claim.job.recipeId);
  const plan = buildWorktreePlan({
    jobId: claim.job.id,
    recipeId: recipe.id,
    repoRoot: repoPath,
  });
  try {
    const baseSha = createWorktree(plan, repoPath);
    const prompt = buildClaudeRecipePrompt(recipe);
    const promptHash = hashText(prompt);
    const command = buildClaudeCommand({ jobId: claim.job.id, prompt, recipe });
    const claude = runCommand(command.command, command.args, {
      cwd: plan.path,
      env,
      timeoutMs: CLAUDE_COMMAND_TIMEOUT_MS,
    });
    const validation = await validateHarnessArtifacts({
      baseSha,
      jobId: claim.job.id,
      promptHash,
      recipe,
      repoRoot: plan.path,
    });
    if (validation.kind === "failed") {
      return await failJob(api, claim.job.id, startedAt, validation.reason);
    }

    assertRemoteBranchPushed(plan.path, plan.branch, env);
    const prUrl = findDraftPrUrl(plan.path, plan.branch, env);
    await api.completeJob({
      artifacts: validation.artifacts,
      claudeSessionId: parseClaudeSessionId(claude.stdout),
      commitSha: readHeadSha(plan.path),
      jobId: claim.job.id,
      prUrl,
      promptHash,
      runtimeMs: Date.now() - startedAt,
    });
    await api.appendEvent({
      jobId: claim.job.id,
      level: "success",
      message: `Draft PR ready: ${prUrl}`,
    });
    return { kind: "completed" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "bridge_failed";
    return await failJob(api, claim.job.id, startedAt, reason);
  }
}

export async function runBridgeLoop(
  input: BridgeRunInput & { intervalMs: number }
) {
  while (true) {
    await runBridgeOnce(input);
    await new Promise((resolve) => setTimeout(resolve, input.intervalMs));
  }
}
