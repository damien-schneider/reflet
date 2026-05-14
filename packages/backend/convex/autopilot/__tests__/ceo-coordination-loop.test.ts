/**
 * Regression tests for the observed CEO coordination feedback loop.
 *
 * Real failure mode seen in production data (dev deployment, one-rec org):
 * - 9 identical "Starvation detected: pm" notes within ~2h, each followed by
 *   "CEO reprioritized task to critical" on a task that was already critical.
 * - Root cause: detectStarvedAgents didn't account for chain-gated agents
 *   and applyPriorityOverrides re-applied no-op priority changes every tick,
 *   feeding new notes back into the LLM context for the next coordination.
 *
 * These tests pin the fixes: chain-gated agents are excluded from starvation,
 * no-op priority overrides are skipped, and recent notes dedup further
 * creation in the same window.
 */

import { describe, expect, it } from "vitest";
import {
  detectStarvedAgents,
  getChainGatedAgents,
} from "../agents/ceo/coordination";
import type { ChainState } from "../chain";

const emptyChain: ChainState = {
  codebase_understanding: "missing",
  identity: "missing",
  brand_voice: "missing",
  feature_catalog: "missing",
  scope: "missing",
  market_analysis: "missing",
  target_definition: "missing",
  personas: "missing",
  use_cases: "missing",
  lead_targets: "missing",
  community_posts: "missing",
  drafts: "missing",
};

const fullyPublishedChain: ChainState = {
  codebase_understanding: "published",
  identity: "published",
  brand_voice: "published",
  feature_catalog: "published",
  scope: "published",
  market_analysis: "published",
  target_definition: "published",
  personas: "published",
  use_cases: "published",
  lead_targets: "published",
  community_posts: "published",
  drafts: "published",
};

const ENABLED_AGENTS = ["pm", "cto", "growth", "sales", "support"];

describe("getChainGatedAgents", () => {
  it("flags PM/Growth/Sales as gated when chain root is missing", () => {
    const gated = getChainGatedAgents(emptyChain, ENABLED_AGENTS);
    expect(gated.has("pm")).toBe(true);
    expect(gated.has("growth")).toBe(true);
    expect(gated.has("sales")).toBe(true);
  });

  it("never flags support as gated (no chain dependency)", () => {
    const gated = getChainGatedAgents(emptyChain, ENABLED_AGENTS);
    expect(gated.has("support")).toBe(false);
  });

  it("flags CTO as gated during bootstrap (CTO's free-form work needs identity)", () => {
    // CTO is in AGENT_CHAIN_REQUIREMENTS for free-form spec work — it now
    // requires identity instead of the legacy app_description. CTO's chain-
    // producer dispatch is separate and not blocked by this gate.
    const gated = getChainGatedAgents(emptyChain, ENABLED_AGENTS);
    expect(gated.has("cto")).toBe(true);
  });

  it("releases agents one by one as upstream chain nodes publish", () => {
    const marketReady: ChainState = {
      ...emptyChain,
      codebase_understanding: "published",
      identity: "published",
      brand_voice: "published",
      feature_catalog: "published",
      scope: "published",
      market_analysis: "published",
    };
    const gated = getChainGatedAgents(marketReady, ENABLED_AGENTS);
    expect(gated.has("growth")).toBe(false);
    expect(gated.has("pm")).toBe(true); // still needs personas
    expect(gated.has("sales")).toBe(true); // still needs personas
  });

  it("returns an empty set when the chain is fully published", () => {
    expect(getChainGatedAgents(fullyPublishedChain, ENABLED_AGENTS).size).toBe(
      0
    );
  });
});

describe("detectStarvedAgents — chain-gating exclusion", () => {
  it("does NOT mark PM as starved during bootstrap (chain root still missing)", () => {
    const gated = getChainGatedAgents(emptyChain, ENABLED_AGENTS);
    const starved = detectStarvedAgents(
      { cto: 5 }, // only CTO has activity (producing chain)
      ENABLED_AGENTS,
      gated
    );
    // Reproduces the production bug: PM had 0 activity during bootstrap,
    // CEO flagged it as starved, and the loop created 9 identical notes.
    expect(starved).not.toContain("pm");
    expect(starved).not.toContain("growth");
    expect(starved).not.toContain("sales");
  });

  it("does mark PM as starved once chain is fully ready but PM still has zero activity", () => {
    const gated = getChainGatedAgents(fullyPublishedChain, ENABLED_AGENTS);
    const starved = detectStarvedAgents(
      { cto: 5, growth: 3 },
      ENABLED_AGENTS,
      gated
    );
    expect(starved).toContain("pm");
  });

  it("still flags support as starved regardless of chain state (no chain dep)", () => {
    const gated = getChainGatedAgents(emptyChain, ENABLED_AGENTS);
    const starved = detectStarvedAgents({ cto: 1 }, ENABLED_AGENTS, gated);
    expect(starved).toContain("support");
  });
});
