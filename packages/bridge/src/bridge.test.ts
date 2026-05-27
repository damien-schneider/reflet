import { DEFAULT_HARNESS_RECIPES } from "@reflet/harness";
import { describe, expect, it } from "vitest";
import {
  buildClaudeRecipePrompt,
  buildWorktreePlan,
  createDoctorReport,
  parseBridgeCommand,
} from "./index";

describe("Reflet Bridge", () => {
  it("parses supported commands without a CLI framework", () => {
    expect(parseBridgeCommand(["doctor"])).toEqual({ kind: "doctor" });
    expect(parseBridgeCommand(["start", "--repo", "/tmp/acme"])).toEqual({
      kind: "start",
      repoPath: "/tmp/acme",
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
    expect(prompt).not.toContain(".reflet/users");
  });

  it("reports bridge blockers before claiming autonomous work", () => {
    expect(
      createDoctorReport({
        claudeCodeAvailable: false,
        gitAvailable: true,
        insideGitRepo: true,
      })
    ).toEqual({
      checks: [
        { label: "Git CLI", passed: true },
        { label: "Git repository", passed: true },
        { label: "Claude Code", passed: false },
      ],
      ready: false,
    });
  });
});
