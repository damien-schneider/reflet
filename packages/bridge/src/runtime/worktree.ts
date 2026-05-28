import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface WorktreePlanInput {
  jobId: string;
  recipeId: string;
  repoRoot: string;
}

export interface WorktreePlan {
  branch: string;
  path: string;
}

export interface CommandResult {
  stdout: string;
}

export interface RunCommandOptions {
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "job";
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

export function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions
): CommandResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    timeout: options.timeoutMs,
  });
  if (
    options.timeoutMs !== undefined &&
    result.error?.message.includes("ETIMEDOUT")
  ) {
    throw new Error(`${command} timed out after ${options.timeoutMs}ms`);
  }
  if (
    options.timeoutMs !== undefined &&
    result.status === null &&
    result.signal === "SIGTERM"
  ) {
    throw new Error(`${command} timed out after ${options.timeoutMs}ms`);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(stderr || `${command} failed with status ${result.status}`);
  }
  return { stdout: result.stdout.trim() };
}

export function createWorktree(plan: WorktreePlan, repoRoot: string): string {
  mkdirSync(join(repoRoot, ".reflet.local", "worktrees"), { recursive: true });
  const baseSha = runCommand("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
  }).stdout;
  runCommand(
    "git",
    ["worktree", "add", "-b", plan.branch, plan.path, baseSha],
    {
      cwd: repoRoot,
    }
  );
  return baseSha;
}

export function readHeadSha(cwd: string): string {
  return runCommand("git", ["rev-parse", "HEAD"], { cwd }).stdout;
}

export function findDraftPrUrl(
  cwd: string,
  branch: string,
  env?: Record<string, string>
): string {
  const url = runCommand(
    "gh",
    [
      "pr",
      "view",
      branch,
      "--json",
      "url,isDraft",
      "--jq",
      "select(.isDraft == true) | .url",
    ],
    { cwd, env }
  ).stdout;
  if (!url) {
    throw new Error("missing_draft_pr");
  }
  return url;
}

export function assertRemoteBranchPushed(
  cwd: string,
  branch: string,
  env?: Record<string, string>
): void {
  try {
    runCommand(
      "git",
      ["ls-remote", "--exit-code", "--heads", "origin", branch],
      {
        cwd,
        env,
      }
    );
  } catch {
    throw new Error("missing_pushed_branch");
  }
}

export function hasRefletDiff(cwd: string, baseSha: string): boolean {
  const result = runCommand(
    "git",
    ["diff", "--name-only", `${baseSha}..HEAD`, "--", ".reflet"],
    { cwd }
  );
  return result.stdout.length > 0;
}

export function hasRefletLocalChanges(cwd: string, baseSha: string): boolean {
  const committed = runCommand(
    "git",
    ["diff", "--name-only", `${baseSha}..HEAD`, "--", ".reflet.local"],
    { cwd }
  );
  if (committed.stdout.length > 0) {
    return true;
  }
  const workingTree = runCommand(
    "git",
    ["status", "--porcelain", "--", ".reflet.local"],
    { cwd }
  );
  return workingTree.stdout.length > 0;
}
