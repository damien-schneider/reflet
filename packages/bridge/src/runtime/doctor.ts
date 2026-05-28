import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DoctorCheck, DoctorReport } from "./types";

const SECRET_PATTERN = /fb_sec_[A-Za-z0-9_-]+|REFLET_SECRET_KEY\s*=/;

export interface DoctorStatusInput {
  claudeCodeAvailable: boolean;
  ghAuthenticated: boolean;
  ghAvailable: boolean;
  gitAvailable: boolean;
  insideGitRepo: boolean;
  refletLocalIgnored: boolean;
  refletSecretsClean: boolean;
  remotePushAvailable: boolean;
}

function commandSucceeds(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>
): boolean {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  return result.status === 0;
}

function hasSecret(value: string): boolean {
  return SECRET_PATTERN.test(value);
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function refletLocalIgnored(
  repoRoot: string,
  env?: Record<string, string>
): boolean {
  return commandSucceeds(
    "git",
    ["check-ignore", "-q", ".reflet.local/"],
    repoRoot,
    env
  );
}

function refletSecretsClean(repoRoot: string): boolean {
  return !collectFiles(join(repoRoot, ".reflet")).some((path) =>
    hasSecret(readFileSync(path, "utf8"))
  );
}

export function createDoctorReport(input: DoctorStatusInput): DoctorReport {
  const checks: DoctorCheck[] = [
    { label: "Git CLI", passed: input.gitAvailable },
    { label: "Git repository", passed: input.insideGitRepo },
    { label: "Git remote push", passed: input.remotePushAvailable },
    { label: "Claude Code", passed: input.claudeCodeAvailable },
    { label: "GitHub CLI", passed: input.ghAvailable },
    { label: "GitHub auth", passed: input.ghAuthenticated },
    { label: ".reflet.local ignored", passed: input.refletLocalIgnored },
    { label: ".reflet secrets clean", passed: input.refletSecretsClean },
  ];
  return {
    checks,
    claudeCodeAvailable: input.claudeCodeAvailable,
    ready: checks.every((check) => check.passed),
  };
}

export function runDoctor(
  repoRoot: string,
  env?: Record<string, string>
): DoctorReport {
  return createDoctorReport({
    claudeCodeAvailable: commandSucceeds(
      "claude",
      ["auth", "status"],
      repoRoot,
      env
    ),
    ghAuthenticated: commandSucceeds("gh", ["auth", "status"], repoRoot, env),
    ghAvailable: commandSucceeds("gh", ["--version"], repoRoot, env),
    gitAvailable: commandSucceeds("git", ["--version"], repoRoot, env),
    insideGitRepo: commandSucceeds(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      repoRoot,
      env
    ),
    refletLocalIgnored: refletLocalIgnored(repoRoot, env),
    refletSecretsClean: refletSecretsClean(repoRoot),
    remotePushAvailable: commandSucceeds(
      "git",
      ["push", "--dry-run", "origin", "HEAD"],
      repoRoot,
      env
    ),
  });
}
