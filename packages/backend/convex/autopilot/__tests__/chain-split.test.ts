/**
 * DAG regression tests for the split-out CTO knowledge nodes.
 *
 * The chain root (`codebase_understanding`) used to feed directly into one big
 * `app_description` node. We split that into four typed knowledge nodes
 * (identity, brand_voice, feature_catalog, scope) so each can be reviewed and
 * edited independently. These tests pin the resulting DAG so an accidental
 * edge change cannot silently merge them back into a single artifact.
 */

import { describe, expect, it } from "vitest";
import {
  type ChainNodeKind,
  type ChainState,
  getNextActionableNodes,
  isNodeReadyToProduce,
} from "../chain";

const KNOWLEDGE_NODES: ChainNodeKind[] = [
  "identity",
  "brand_voice",
  "feature_catalog",
  "scope",
];

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

describe("chain DAG with split knowledge nodes", () => {
  it("treats codebase_understanding as the only actionable node when chain is empty", () => {
    expect(getNextActionableNodes(emptyChain)).toEqual([
      "codebase_understanding",
    ]);
  });

  it("opens all 4 knowledge nodes in parallel once codebase_understanding is published", () => {
    const state: ChainState = {
      ...emptyChain,
      codebase_understanding: "published",
    };

    for (const node of KNOWLEDGE_NODES) {
      expect(isNodeReadyToProduce(state, node)).toBe(true);
    }

    // Downstream nodes wait for ALL four knowledge nodes
    expect(isNodeReadyToProduce(state, "market_analysis")).toBe(false);
  });

  it("treats partial knowledge publication as still-actionable for the missing siblings only", () => {
    const state: ChainState = {
      ...emptyChain,
      codebase_understanding: "published",
      identity: "published",
      brand_voice: "published",
    };
    const actionable = getNextActionableNodes(state);
    expect(actionable).toContain("feature_catalog");
    expect(actionable).toContain("scope");
    expect(actionable).not.toContain("identity");
    expect(actionable).not.toContain("brand_voice");
    expect(actionable).not.toContain("market_analysis");
  });

  it("opens market_analysis once all 4 typed knowledge nodes are published", () => {
    const partialKnowledge: ChainState = {
      ...emptyChain,
      codebase_understanding: "published",
      identity: "published",
      brand_voice: "published",
      feature_catalog: "published",
      // scope still missing
    };
    expect(isNodeReadyToProduce(partialKnowledge, "market_analysis")).toBe(
      false
    );

    const allKnowledgeReady: ChainState = {
      ...partialKnowledge,
      scope: "published",
    };
    expect(isNodeReadyToProduce(allKnowledgeReady, "market_analysis")).toBe(
      true
    );
  });
});
