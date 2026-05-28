import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_HARNESS_RECIPES } from "@reflet/harness";
import { describe, expect, it } from "vitest";
import { parseBridgeCommand } from "./runtime/command";
import { createDoctorReport } from "./runtime/doctor";
import { buildClaudeCommand, buildClaudeRecipePrompt } from "./runtime/prompt";
import { runBridgeOnce } from "./runtime/runner";
import { validateHarnessArtifacts } from "./runtime/validation";
import {
  assertRemoteBranchPushed,
  buildWorktreePlan,
  runCommand,
} from "./runtime/worktree";

function runGit(args: string[]): void {
  execFileSync("git", args, { stdio: "ignore" });
}

describe("Reflet Bridge", () => {
  it("parses supported commands without a CLI framework", () => {
    expect(parseBridgeCommand(["doctor"])).toEqual({
      kind: "doctor",
      repoPath: ".",
    });
    expect(parseBridgeCommand(["doctor", "--repo", "/tmp/acme"])).toEqual({
      kind: "doctor",
      repoPath: "/tmp/acme",
    });
    expect(parseBridgeCommand(["start", "--repo", "/tmp/acme"])).toEqual({
      kind: "start",
      repoPath: "/tmp/acme",
      repoFullName: null,
      siteUrl: null,
      intervalMs: 15_000,
    });
    expect(
      parseBridgeCommand([
        "run-once",
        "--site-url",
        "https://example.convex.site",
        "--repo",
        "/tmp/acme",
        "--repo-full-name",
        "acme/reflet",
      ])
    ).toEqual({
      kind: "run-once",
      siteUrl: "https://example.convex.site",
      repoPath: "/tmp/acme",
      repoFullName: "acme/reflet",
    });
  });

  it("creates deterministic isolated worktree branches per job", () => {
    expect(
      buildWorktreePlan({
        jobId: "job_123",
        recipeId: "Product Brain",
        repoRoot: "/repo/acme",
      })
    ).toEqual({
      branch: "reflet/product-brain/job-123",
      path: "/repo/acme/.reflet.local/worktrees/job-123",
    });
  });

  it("times out commands that exceed their runtime cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-command-timeout-"));
    const bin = join(root, "bin");
    try {
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, "slow-command"), "#!/bin/sh\nsleep 2\n");
      await chmod(join(bin, "slow-command"), 0o755);

      expect(() =>
        runCommand("slow-command", [], {
          cwd: root,
          env: { PATH: `${bin}:${process.env.PATH ?? ""}` },
          timeoutMs: 10,
        })
      ).toThrow("slow-command timed out after 10ms");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("requires generated branches to exist on the remote", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-remote-branch-"));
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    const branch = "reflet/product-brain/job-123";
    try {
      runGit(["init", "--bare", remote]);
      runGit(["init", repo]);
      runGit(["-C", repo, "config", "user.email", "bridge@example.com"]);
      runGit(["-C", repo, "config", "user.name", "Reflet Bridge"]);
      await writeFile(join(repo, "README.md"), "Reflet test repo\n");
      runGit(["-C", repo, "add", "README.md"]);
      runGit(["-C", repo, "commit", "-m", "init"]);
      runGit(["-C", repo, "remote", "add", "origin", remote]);

      expect(() => assertRemoteBranchPushed(repo, branch)).toThrow(
        "missing_pushed_branch"
      );

      runGit(["-C", repo, "checkout", "-b", branch]);
      runGit(["-C", repo, "push", "-u", "origin", "HEAD"]);

      expect(() => assertRemoteBranchPushed(repo, branch)).not.toThrow();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("builds Claude prompts around the ProductMap TASK harness", () => {
    const recipe = DEFAULT_HARNESS_RECIPES.find(
      (candidate) => candidate.id === "product-brain"
    );
    if (!recipe) {
      throw new Error("Expected product-brain recipe");
    }
    const prompt = buildClaudeRecipePrompt(recipe);

    expect(prompt).toContain("ProductMap TASK");
    expect(prompt).toContain("Topics, Agents, Skills, Knowledge");
    expect(prompt).toContain("product-strategist");
    expect(prompt).toContain(".reflet/strategy/product-brain.md");
    expect(prompt).toContain("## Evidence");
    expect(prompt).toContain("grep -n '^## Evidence'");
    expect(prompt).not.toContain(".reflet/users");
  });

  it("reports bridge blockers before claiming autonomous work", () => {
    expect(
      createDoctorReport({
        claudeCodeAvailable: false,
        gitAvailable: true,
        insideGitRepo: true,
        ghAvailable: true,
        ghAuthenticated: true,
        refletLocalIgnored: true,
        refletSecretsClean: true,
        remotePushAvailable: true,
      })
    ).toEqual({
      checks: [
        { label: "Git CLI", passed: true },
        { label: "Git repository", passed: true },
        { label: "Git remote push", passed: true },
        { label: "Claude Code", passed: false },
        { label: "GitHub CLI", passed: true },
        { label: "GitHub auth", passed: true },
        { label: ".reflet.local ignored", passed: true },
        { label: ".reflet secrets clean", passed: true },
      ],
      claudeCodeAvailable: false,
      ready: false,
    });
  });

  it("builds Claude commands that let Claude own repo and PR work", () => {
    const recipe = DEFAULT_HARNESS_RECIPES.find(
      (candidate) => candidate.id === "product-brain"
    );
    if (!recipe) {
      throw new Error("Expected product-brain recipe");
    }

    const command = buildClaudeCommand({
      jobId: "job-123",
      prompt: buildClaudeRecipePrompt(recipe),
      recipe,
    });

    expect(command.command).toBe("claude");
    expect(command.args).toContain("--print");
    expect(command.args).toContain("--permission-mode");
    expect(command.args).toContain("acceptEdits");
    expect(command.args.join(" ")).toContain("Bash(gh pr *)");
    expect(command.args.join(" ")).toContain("Bash(git *)");
  });

  it("validates generated artifacts and rejects secrets or private user folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-"));
    try {
      await mkdir(join(root, ".reflet", "strategy"), { recursive: true });
      await writeFile(
        join(root, ".reflet", "strategy", "leak.md"),
        "REFLET_SECRET_KEY=fb_sec_leaked"
      );
      const recipe = DEFAULT_HARNESS_RECIPES.find(
        (candidate) => candidate.id === "product-brain"
      );
      if (!recipe) {
        throw new Error("Expected product-brain recipe");
      }

      const result = await validateHarnessArtifacts({
        baseSha: "base",
        jobId: "job-123",
        promptHash: "prompt",
        recipe,
        repoRoot: root,
      });

      expect(result.kind).toBe("failed");
      if (result.kind === "failed") {
        expect(result.reason).toBe("secret_detected");
      }
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("runs one claimed job through fake Claude and validates the draft PR", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-e2e-"));
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    const bin = join(root, "bin");
    const prState = join(root, "pr-created");

    try {
      runGit(["init", "--bare", remote]);
      runGit(["init", repo]);
      runGit(["-C", repo, "config", "user.email", "bridge@example.com"]);
      runGit(["-C", repo, "config", "user.name", "Reflet Bridge"]);
      await writeFile(join(repo, "README.md"), "Reflet test repo\n");
      await writeFile(join(repo, ".gitignore"), ".reflet.local/\n");
      runGit(["-C", repo, "add", "README.md", ".gitignore"]);
      runGit(["-C", repo, "commit", "-m", "init"]);
      runGit(["-C", repo, "remote", "add", "origin", remote]);
      runGit(["-C", repo, "push", "-u", "origin", "HEAD"]);
      execFileSync("mkdir", ["-p", bin], { stdio: "ignore" });
      await writeFile(
        join(bin, "gh"),
        [
          "#!/bin/sh",
          'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
          'if [ "$1" = "auth" ]; then exit 0; fi',
          'if [ "$1" = "pr" ] && [ "$2" = "create" ]; then echo created > "$REFLET_PR_STATE"; echo https://github.com/acme/reflet/pull/42; exit 0; fi',
          'if [ "$1" = "pr" ] && [ "$2" = "view" ] && [ -f "$REFLET_PR_STATE" ]; then echo https://github.com/acme/reflet/pull/42; exit 0; fi',
          "exit 1",
        ].join("\n")
      );
      await writeFile(
        join(bin, "claude"),
        [
          "#!/bin/sh",
          'if [ "$1" = "auth" ]; then exit 0; fi',
          "mkdir -p .reflet/strategy",
          "cat > .reflet/strategy/product-brain.md <<'EOF'",
          "# Product Brain",
          "",
          "## Evidence",
          "- README.md",
          "EOF",
          "git add .reflet/strategy/product-brain.md",
          "git commit -m 'Add Reflet Product Brain'",
          "git push -u origin HEAD",
          "gh pr create --draft --title 'Reflet Product Brain' --body 'Generated by Reflet Bridge'",
          'echo \'{"session_id":"claude-test-session"}\'',
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const events: string[] = [];
      const completions: string[] = [];
      const result = await runBridgeOnce({
        api: {
          appendEvent: async (event) => {
            events.push(event.message);
          },
          claimJob: async () => ({
            job: {
              id: "job-123",
              recipeId: "product-brain",
              recipeVersion: 1,
              title: "Build Product Brain",
              worktreeBranch: "reflet/product-brain/job-123",
            },
          }),
          completeJob: async (completion) => {
            completions.push(completion.prUrl);
          },
          failJob: async () => {
            throw new Error("Expected success");
          },
          heartbeat: async () => undefined,
          register: async () => ({ bridgeInstallationId: "bridge-123" }),
        },
        bridgeName: "test-bridge",
        env: {
          PATH: `${bin}:${process.env.PATH ?? ""}`,
          REFLET_PR_STATE: prState,
        },
        repoFullName: "acme/reflet",
        repoPath: repo,
      });

      expect(result.kind).toBe("completed");
      expect(events).toContain("Claimed Build Product Brain");
      expect(completions).toEqual(["https://github.com/acme/reflet/pull/42"]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("marks claimed jobs blocked when Claude exits unsuccessfully", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-fail-"));
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    const bin = join(root, "bin");

    try {
      runGit(["init", "--bare", remote]);
      runGit(["init", repo]);
      runGit(["-C", repo, "config", "user.email", "bridge@example.com"]);
      runGit(["-C", repo, "config", "user.name", "Reflet Bridge"]);
      await writeFile(join(repo, "README.md"), "Reflet test repo\n");
      await writeFile(join(repo, ".gitignore"), ".reflet.local/\n");
      runGit(["-C", repo, "add", "README.md", ".gitignore"]);
      runGit(["-C", repo, "commit", "-m", "init"]);
      runGit(["-C", repo, "remote", "add", "origin", remote]);
      runGit(["-C", repo, "push", "-u", "origin", "HEAD"]);
      execFileSync("mkdir", ["-p", bin], { stdio: "ignore" });
      await writeFile(
        join(bin, "gh"),
        [
          "#!/bin/sh",
          'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
          'if [ "$1" = "auth" ]; then exit 0; fi',
          "exit 1",
        ].join("\n")
      );
      await writeFile(
        join(bin, "claude"),
        [
          "#!/bin/sh",
          'if [ "$1" = "auth" ]; then exit 0; fi',
          "echo claude failed >&2",
          "exit 42",
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const failures: string[] = [];
      const result = await runBridgeOnce({
        api: {
          appendEvent: async () => undefined,
          claimJob: async () => ({
            job: {
              id: "job-123",
              recipeId: "product-brain",
              recipeVersion: 1,
              title: "Build Product Brain",
              worktreeBranch: "reflet/product-brain/job-123",
            },
          }),
          completeJob: async () => {
            throw new Error("Expected failure");
          },
          failJob: async (failure) => {
            failures.push(failure.failureReason);
          },
          heartbeat: async () => undefined,
          register: async () => ({ bridgeInstallationId: "bridge-123" }),
        },
        bridgeName: "test-bridge",
        env: { PATH: `${bin}:${process.env.PATH ?? ""}` },
        repoFullName: "acme/reflet",
        repoPath: repo,
      });

      expect(result.kind).toBe("blocked");
      expect(failures[0]).toContain("claude failed");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);
});
