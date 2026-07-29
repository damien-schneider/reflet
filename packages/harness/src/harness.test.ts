import { describe, expect, it } from "vitest";
import {
  DEFAULT_HARNESS_RECIPES,
  evaluateHarnessGuards,
  parseHarnessRecipe,
  REFLET_KNOWLEDGE_PATHS,
  resolveRecipeRunDecision,
  resolveRecipeSink,
} from "./index";

describe("repo-native product harness", () => {
  it("ships ProductMap-inspired recipes with explicit subagents and validators", () => {
    const recipe = parseHarnessRecipe(DEFAULT_HARNESS_RECIPES[0]);

    expect(recipe.productMapTopic).toBe("product_strategy");
    expect(recipe.productMapLifecycle).toBe("strategy");
    expect(recipe.subagents).toContain("product-strategist");
    expect(recipe.subagents).toContain("critic-validator");
    expect(recipe.validations).toContain("evidence_required");
  });

  it("routes knowledge recipes to artifacts, drafts to documents, and code to the PR sink", () => {
    const productBrain = parseHarnessRecipe(
      DEFAULT_HARNESS_RECIPES.find((recipe) => recipe.id === "product-brain")
    );
    // product-brain is now a knowledge recipe: its body is harvested into
    // refletArtifacts rather than pushed as a draft PR.
    expect(productBrain.sink).toBe("artifacts");
    expect(resolveRecipeSink(productBrain)).toBe("artifacts");

    // pr-builder still ships real code changes, so it keeps the PR sink and
    // its unset (default) sink must resolve to "pr".
    const prBuilder = parseHarnessRecipe(
      DEFAULT_HARNESS_RECIPES.find((recipe) => recipe.id === "pr-builder")
    );
    expect(prBuilder.sink).toBeUndefined();
    expect(resolveRecipeSink(prBuilder)).toBe("pr");

    const marketingReddit = parseHarnessRecipe(
      DEFAULT_HARNESS_RECIPES.find((recipe) => recipe.id === "marketing-reddit")
    );
    expect(resolveRecipeSink(marketingReddit)).toBe("documents");
    expect(marketingReddit.allowedTools).toContain("Bash(curl *)");
    expect(marketingReddit.outputs[0]?.artifactKind).toBe("community_drafts");
  });

  it("keeps audience research out of a users folder", () => {
    expect(REFLET_KNOWLEDGE_PATHS).toContain(".reflet/audience");
    expect(REFLET_KNOWLEDGE_PATHS).toContain(".reflet/user-research");
    expect(REFLET_KNOWLEDGE_PATHS).not.toContain(".reflet/users");
  });

  it("reruns recipes only from explicit signals, never elapsed time", () => {
    const currentHashes = { codebase: "sha-a", market: "sha-b" };

    expect(
      resolveRecipeRunDecision({
        currentInputHashes: currentHashes,
        failedValidation: false,
        manualRequest: false,
        newEvidence: false,
        previousInputHashes: currentHashes,
        previousOutputHash: "out-a",
        producedOutputHash: "out-a",
      })
    ).toEqual({ reason: "unchanged", shouldRun: false });

    expect(
      resolveRecipeRunDecision({
        currentInputHashes: { ...currentHashes, market: "sha-c" },
        failedValidation: false,
        manualRequest: false,
        newEvidence: false,
        previousInputHashes: currentHashes,
        previousOutputHash: "out-a",
        producedOutputHash: "out-a",
      })
    ).toEqual({ reason: "input_changed", shouldRun: true });
  });

  it("blocks unsafe autonomous loops before they burn attention or credits", () => {
    expect(
      evaluateHarnessGuards({
        bridgeOnline: true,
        claudeAvailable: true,
        consecutiveNoopRuns: 0,
        consecutiveValidatorFailures: 0,
        openRefletPrs: 3,
        pendingApprovals: 5,
        worktreeClean: true,
      })
    ).toEqual({ allowed: false, reason: "approval_cap_reached" });

    expect(
      evaluateHarnessGuards({
        bridgeOnline: true,
        claudeAvailable: true,
        consecutiveNoopRuns: 2,
        consecutiveValidatorFailures: 0,
        openRefletPrs: 0,
        pendingApprovals: 0,
        worktreeClean: true,
      })
    ).toEqual({ allowed: false, reason: "noop_loop_detected" });
  });
});
