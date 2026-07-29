import { execFileSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_HARNESS_RECIPES } from "@reflet/harness";
import { describe, expect, it } from "vitest";
import { parseBridgeCommand } from "./runtime/command";
import { createDoctorReport } from "./runtime/doctor";
import { buildClaudeCommand, buildClaudeRecipePrompt } from "./runtime/prompt";
import { runBridgeOnce } from "./runtime/runner";
import type { BridgeSeedArtifact } from "./runtime/types";
import { validateHarnessArtifacts } from "./runtime/validation";
import {
  assertRemoteBranchPushed,
  buildWorktreePlan,
  runCommand,
} from "./runtime/worktree";

function runGit(args: string[]): void {
  execFileSync("git", args, { stdio: "ignore" });
}

// Default no-op seed feed so existing tests don't have to thread it through.
function noSeedArtifacts(): Promise<BridgeSeedArtifact[]> {
  return Promise.resolve([]);
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
    // product-brain is an artifacts-sink recipe: the prompt must explicitly
    // tell Claude not to push/PR, since the harness harvests files directly.
    expect(prompt).toContain("do NOT open a PR");
    expect(prompt).not.toContain("gh pr create");
  });

  it("tells PR-sink recipes to push and open a draft PR", () => {
    const recipe = DEFAULT_HARNESS_RECIPES.find(
      (candidate) => candidate.id === "pr-builder"
    );
    if (!recipe) {
      throw new Error("Expected pr-builder recipe");
    }
    const prompt = buildClaudeRecipePrompt(recipe);

    expect(prompt).toContain("gh pr create --draft");
    expect(prompt).toContain("push the current branch");
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

  it("harvests an artifacts-sink job (product-brain) without pushing or opening a PR", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-artifacts-"));
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
      // gh fails on any call: an artifacts-sink run must never push or open a PR.
      await writeFile(
        join(bin, "gh"),
        [
          "#!/bin/sh",
          'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
          'if [ "$1" = "auth" ]; then exit 0; fi',
          "exit 1",
        ].join("\n")
      );
      // Claude only writes the .reflet body (no commit, no push, no PR).
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
          'echo \'{"session_id":"claude-artifacts-session"}\'',
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const completions: Array<{
        artifactKinds: string[];
        hasContent: boolean;
        prUrl: string;
      }> = [];
      const events: string[] = [];
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
            completions.push({
              artifactKinds: completion.artifacts.map((a) => a.artifactKind),
              hasContent: completion.artifacts.some(
                (a) => (a.content?.length ?? 0) > 0
              ),
              prUrl: completion.prUrl,
            });
          },
          failJob: async (failure) => {
            throw new Error(`Expected success, got: ${failure.failureReason}`);
          },
          fetchSeedArtifacts: noSeedArtifacts,
          heartbeat: async () => undefined,
          register: async () => ({ bridgeInstallationId: "bridge-123" }),
        },
        bridgeName: "test-bridge",
        env: { PATH: `${bin}:${process.env.PATH ?? ""}` },
        repoFullName: "acme/reflet",
        repoPath: repo,
      });

      expect(result.kind).toBe("completed");
      expect(completions).toHaveLength(1);
      expect(completions[0]?.prUrl).toBe("");
      expect(completions[0]?.artifactKinds).toEqual(["product_brain"]);
      expect(completions[0]?.hasContent).toBe(true);
      expect(events.some((message) => message.includes("Harvested"))).toBe(
        true
      );
      expect(events.some((message) => message.includes("Draft PR"))).toBe(
        false
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("seeds prior artifacts into the worktree before running the recipe", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-seed-"));
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
      // The recipe folds the seeded upstream artifact into its own output, so
      // the seeded file must already exist in the worktree when Claude runs.
      // The stub appends the seeded map verbatim (cat copies the whole file,
      // even without a trailing newline) into the artifact's Evidence section.
      await writeFile(
        join(bin, "claude"),
        [
          "#!/bin/sh",
          'if [ "$1" = "auth" ]; then exit 0; fi',
          "mkdir -p .reflet/strategy",
          "out=.reflet/strategy/product-brain.md",
          'echo "# Product Brain" > "$out"',
          'echo "" >> "$out"',
          'echo "## Evidence" >> "$out"',
          "if [ -f .reflet/codebase/map.md ]; then",
          '  cat .reflet/codebase/map.md >> "$out"',
          "fi",
          'echo \'{"session_id":"claude-seed-session"}\'',
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const seedRequests: string[] = [];
      const completions: Array<{ content: string | undefined }> = [];
      const events: string[] = [];
      const result = await runBridgeOnce({
        api: {
          appendEvent: async (event) => {
            events.push(event.message);
          },
          claimJob: async () => ({
            job: {
              id: "job-seed",
              recipeId: "product-brain",
              recipeVersion: 1,
              title: "Build Product Brain",
              worktreeBranch: "reflet/product-brain/job-seed",
            },
          }),
          completeJob: async (completion) => {
            completions.push({ content: completion.artifacts[0]?.content });
          },
          failJob: async (failure) => {
            throw new Error(`Expected success, got: ${failure.failureReason}`);
          },
          fetchSeedArtifacts: (repoFullName) => {
            seedRequests.push(repoFullName);
            return Promise.resolve([
              {
                content: "UPSTREAM_MAP_MARKER https://reflet.example/map",
                path: ".reflet/codebase/map.md",
              },
              {
                // Escapes .reflet/ — must be dropped, never written outside.
                content: "should-not-be-written",
                path: "../escape.md",
              },
            ]);
          },
          heartbeat: async () => undefined,
          register: async () => ({ bridgeInstallationId: "bridge-123" }),
        },
        bridgeName: "test-bridge",
        env: { PATH: `${bin}:${process.env.PATH ?? ""}` },
        repoFullName: "acme/reflet",
        repoPath: repo,
      });

      expect(result.kind).toBe("completed");
      expect(seedRequests).toEqual(["acme/reflet"]);
      expect(completions[0]?.content).toContain("UPSTREAM_MAP_MARKER");
      expect(
        events.some((message) => message.includes("Seeded 1 prior artifact"))
      ).toBe(true);

      // The escaping artifact must NOT have been materialized outside .reflet/.
      await expect(readFile(join(root, "escape.md"), "utf8")).rejects.toThrow();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("runs a PR-sink job (pr-builder) through fake Claude and validates the draft PR", async () => {
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
          "mkdir -p .reflet/delivery",
          "cat > .reflet/delivery/pr-draft.md <<'EOF'",
          "# PR Builder",
          "",
          "## Evidence",
          "- .reflet/tasks/plan.md",
          "EOF",
          "git add .reflet/delivery/pr-draft.md",
          "git commit -m 'Add Reflet PR draft'",
          "git push -u origin HEAD",
          "gh pr create --draft --title 'Reflet PR' --body 'Generated by Reflet Bridge'",
          'echo \'{"session_id":"claude-pr-session"}\'',
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const events: string[] = [];
      const completions: Array<{ artifactKind: string; prUrl: string }> = [];
      const result = await runBridgeOnce({
        api: {
          appendEvent: async (event) => {
            events.push(event.message);
          },
          claimJob: async () => ({
            job: {
              id: "job-pr",
              recipeId: "pr-builder",
              recipeVersion: 1,
              title: "Build PR",
              worktreeBranch: "reflet/pr-builder/job-pr",
            },
          }),
          completeJob: async (completion) => {
            completions.push({
              artifactKind: completion.artifacts[0]?.artifactKind ?? "",
              prUrl: completion.prUrl,
            });
          },
          failJob: async (failure) => {
            throw new Error(`Expected success, got: ${failure.failureReason}`);
          },
          fetchSeedArtifacts: noSeedArtifacts,
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
      expect(events).toContain("Claimed Build PR");
      expect(completions).toEqual([
        {
          artifactKind: "pull_request_draft",
          prUrl: "https://github.com/acme/reflet/pull/42",
        },
      ]);
      expect(events.some((message) => message.includes("Draft PR"))).toBe(true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 15_000);

  it("runs a documents-sink job and completes with drafted documents instead of a PR", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-docs-"));
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
      // gh fails on any call: a documents-sink run must never push or open a PR.
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
          "mkdir -p .reflet/out/marketing",
          "cat > .reflet/out/marketing/reddit.json <<'EOF'",
          JSON.stringify({
            documents: [
              {
                type: "reddit_reply",
                title: "Reply to r/SaaS thread",
                targetUrl: "https://www.reddit.com/r/SaaS/comments/abc123/",
                content:
                  "Helpful reply referencing https://www.reddit.com/r/SaaS/comments/abc123/",
                platform: "reddit",
              },
            ],
          }),
          "EOF",
          'echo \'{"session_id":"claude-docs-session"}\'',
        ].join("\n")
      );
      await chmod(join(bin, "gh"), 0o755);
      await chmod(join(bin, "claude"), 0o755);

      const completions: Array<{
        documents?: Array<{ targetUrl?: string; title: string; type: string }>;
        prUrl: string;
      }> = [];
      const events: string[] = [];
      const result = await runBridgeOnce({
        api: {
          appendEvent: async (event) => {
            events.push(event.message);
          },
          claimJob: async () => ({
            job: {
              id: "job-456",
              recipeId: "marketing-reddit",
              recipeVersion: 1,
              title: "Marketing Reddit Replies",
              worktreeBranch: "reflet/marketing-reddit/job-456",
            },
          }),
          completeJob: async (completion) => {
            completions.push({
              documents: completion.documents,
              prUrl: completion.prUrl,
            });
          },
          failJob: async (failure) => {
            throw new Error(`Expected success, got: ${failure.failureReason}`);
          },
          fetchSeedArtifacts: noSeedArtifacts,
          heartbeat: async () => undefined,
          register: async () => ({ bridgeInstallationId: "bridge-123" }),
        },
        bridgeName: "test-bridge",
        env: { PATH: `${bin}:${process.env.PATH ?? ""}` },
        repoFullName: "acme/reflet",
        repoPath: repo,
      });

      expect(result.kind).toBe("completed");
      expect(completions).toHaveLength(1);
      expect(completions[0]?.prUrl).toBe("");
      expect(completions[0]?.documents).toEqual([
        {
          type: "reddit_reply",
          title: "Reply to r/SaaS thread",
          targetUrl: "https://www.reddit.com/r/SaaS/comments/abc123/",
          content:
            "Helpful reply referencing https://www.reddit.com/r/SaaS/comments/abc123/",
          platform: "reddit",
        },
      ]);
      expect(events.some((message) => message.includes("Drafted 1"))).toBe(
        true
      );
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
          fetchSeedArtifacts: noSeedArtifacts,
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
