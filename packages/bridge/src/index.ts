import { join } from "node:path";
import type { HarnessRecipe } from "@reflet/harness";

export type BridgeCommand =
  | { kind: "doctor" }
  | { kind: "start"; repoPath: string };

export interface WorktreePlanInput {
  jobId: string;
  recipeId: string;
  repoRoot: string;
}

export interface WorktreePlan {
  branch: string;
  path: string;
}

export interface DoctorStatusInput {
  claudeCodeAvailable: boolean;
  gitAvailable: boolean;
  insideGitRepo: boolean;
}

export interface DoctorCheck {
  label: string;
  passed: boolean;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  ready: boolean;
}

function readOption(args: string[], option: string): string | null {
  const index = args.indexOf(option);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "job";
}

export function parseBridgeCommand(args: string[]): BridgeCommand {
  const command = args[0] ?? "doctor";
  if (command === "start") {
    return { kind: "start", repoPath: readOption(args, "--repo") ?? "." };
  }
  return { kind: "doctor" };
}

export function buildWorktreePlan({
  jobId,
  recipeId,
  repoRoot,
}: WorktreePlanInput): WorktreePlan {
  const safeJobId = slugify(jobId);
  return {
    branch: `reflet/${slugify(recipeId)}/${safeJobId}`,
    path: join(repoRoot, ".reflet.local", "worktrees", safeJobId),
  };
}

export function buildClaudeRecipePrompt(recipe: HarnessRecipe): string {
  const outputs = recipe.outputs
    .map((output) => `- ${output.artifactKind}: ${output.path}`)
    .join("\n");
  const subagents = recipe.subagents
    .map((subagent) => `- ${subagent}`)
    .join("\n");
  const validations = recipe.validations
    .map((validation) => `- ${validation}`)
    .join("\n");

  return [
    "You are running the Reflet repo-native product harness.",
    "Use the ProductMap TASK model: Topics, Agents, Skills, Knowledge.",
    `Topic: ${recipe.productMapTopic}`,
    `Lifecycle: ${recipe.productMapLifecycle}`,
    "",
    "Required subagents:",
    subagents,
    "",
    "Required outputs:",
    outputs,
    "",
    "Validators:",
    validations,
    "",
    "Never create a users folder under .reflet. Audience research belongs in .reflet/audience and .reflet/user-research.",
    "Do not perform external actions without approval. Write evidence-backed Markdown artifacts only.",
  ].join("\n");
}

export function createDoctorReport({
  claudeCodeAvailable,
  gitAvailable,
  insideGitRepo,
}: DoctorStatusInput): DoctorReport {
  const checks = [
    { label: "Git CLI", passed: gitAvailable },
    { label: "Git repository", passed: insideGitRepo },
    { label: "Claude Code", passed: claudeCodeAvailable },
  ];
  return {
    checks,
    ready: checks.every((check) => check.passed),
  };
}
