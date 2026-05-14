/**
 * Regression tests for chain producers persisting empty artifacts.
 *
 * Real failure mode: when an LLM call returned a structurally valid object
 * but with empty required strings (oneLineSummary === "", whatItDoes === "",
 * etc.), the chain advanced state to "published" with no real content. The
 * "starvation detected" alerts then masked the fact that downstream agents
 * were grounding on an empty doc.
 *
 * Producers now call `assertNonEmpty` on every required field before persist.
 * These tests pin the contract: empty strings, whitespace-only strings, and
 * empty arrays must all throw EmptyChainArtifactError.
 */

import { describe, expect, it } from "vitest";
import {
  assertNonEmpty,
  EmptyChainArtifactError,
} from "../agents/chain_producers";

describe("assertNonEmpty", () => {
  it("passes when every field has real content", () => {
    expect(() =>
      assertNonEmpty("identity", {
        oneLineSummary: "A real summary",
        whatItDoes: "Records screen and edits videos",
        verbs: ["record", "edit", "share"],
      })
    ).not.toThrow();
  });

  it("rejects an empty string field", () => {
    expect(() =>
      assertNonEmpty("identity", {
        oneLineSummary: "",
        whatItDoes: "Real content",
      })
    ).toThrow(EmptyChainArtifactError);
  });

  it("rejects a whitespace-only string field (reproduces empty-output drift)", () => {
    expect(() =>
      assertNonEmpty("market_analysis", {
        positioning: "   \n  \t  ",
        competitiveLandscape: "Real content",
      })
    ).toThrow(EmptyChainArtifactError);
  });

  it("rejects an empty array field", () => {
    expect(() =>
      assertNonEmpty("brand_voice", {
        tone: "Direct",
        doList: [],
      })
    ).toThrow(EmptyChainArtifactError);
  });

  it("rejects an array of empty strings (LLM returned shape, no signal)", () => {
    expect(() =>
      assertNonEmpty("feature_catalog", {
        features: ["", "  ", ""],
      })
    ).toThrow(EmptyChainArtifactError);
  });

  it("error message names the offending node and field for log triage", () => {
    try {
      assertNonEmpty("scope", { currentScope: "" });
      throw new Error("assertNonEmpty did not throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EmptyChainArtifactError);
      const message = (error as Error).message;
      expect(message).toContain("scope");
      expect(message).toContain("currentScope");
    }
  });
});
