import { describe, expect, it } from "vitest";
import type { ChainState } from "../chain";
import {
  type ActivitySummary,
  isChainGated,
  shouldWakeCEO,
  shouldWakeCTO,
  shouldWakeDev,
  shouldWakeGrowth,
  shouldWakePM,
  shouldWakeSales,
  shouldWakeSupport,
  shouldWakeValidator,
} from "../heartbeat_conditions";

const emptyChain: ChainState = {
  codebase_understanding: "missing",
  app_description: "missing",
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
  app_description: "published",
  market_analysis: "published",
  target_definition: "published",
  personas: "published",
  use_cases: "published",
  lead_targets: "published",
  community_posts: "published",
  drafts: "published",
};

const BASE_SUMMARY: ActivitySummary = {
  openTaskCount: 0,
  wakeThresholdOpenTasks: 5,
  chainState: emptyChain,
  newSupportConversationCount: 0,
  pendingValidationCount: 0,
  stuckReviewCount: 0,
  recentErrorCount: 0,
  shippedFeaturesWithoutContent: 0,
  now: Date.now(),
};

describe("isChainGated", () => {
  it("gates when openTaskCount >= threshold", () => {
    expect(isChainGated({ ...BASE_SUMMARY, openTaskCount: 5 })).toBe(true);
    expect(isChainGated({ ...BASE_SUMMARY, openTaskCount: 6 })).toBe(true);
  });

  it("does not gate when openTaskCount < threshold", () => {
    expect(isChainGated({ ...BASE_SUMMARY, openTaskCount: 4 })).toBe(false);
  });
});

describe("shouldWakeCTO", () => {
  it("wakes when codebase_understanding missing (chain root)", () => {
    expect(shouldWakeCTO(BASE_SUMMARY)).toBe(true);
  });

  it("wakes when app_description ready to produce", () => {
    expect(
      shouldWakeCTO({
        ...BASE_SUMMARY,
        chainState: { ...emptyChain, codebase_understanding: "published" },
      })
    ).toBe(true);
  });

  it("does not wake when chain gated by open tasks", () => {
    expect(shouldWakeCTO({ ...BASE_SUMMARY, openTaskCount: 5 })).toBe(false);
  });

  it("does not wake when chain fully published", () => {
    expect(
      shouldWakeCTO({ ...BASE_SUMMARY, chainState: fullyPublishedChain })
    ).toBe(false);
  });
});

describe("shouldWakePM", () => {
  it("wakes when target_definition ready (market_analysis published)", () => {
    expect(
      shouldWakePM({
        ...BASE_SUMMARY,
        chainState: {
          ...emptyChain,
          codebase_understanding: "published",
          app_description: "published",
          market_analysis: "published",
        },
      })
    ).toBe(true);
  });

  it("does not wake when upstream incomplete", () => {
    expect(shouldWakePM(BASE_SUMMARY)).toBe(false);
  });

  it("does not wake when chain gated", () => {
    expect(
      shouldWakePM({
        ...BASE_SUMMARY,
        openTaskCount: 6,
        chainState: {
          ...emptyChain,
          codebase_understanding: "published",
          app_description: "published",
          market_analysis: "published",
        },
      })
    ).toBe(false);
  });
});

describe("shouldWakeGrowth", () => {
  it("wakes when market_analysis ready", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        chainState: {
          ...emptyChain,
          codebase_understanding: "published",
          app_description: "published",
        },
      })
    ).toBe(true);
  });

  it("wakes for shipped features without content (when not gated)", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        chainState: fullyPublishedChain,
        shippedFeaturesWithoutContent: 2,
      })
    ).toBe(true);
  });

  it("does not wake for shipped features when gated", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        chainState: fullyPublishedChain,
        shippedFeaturesWithoutContent: 2,
        openTaskCount: 6,
      })
    ).toBe(false);
  });
});

describe("shouldWakeSales", () => {
  it("wakes when lead_targets ready (personas published)", () => {
    expect(
      shouldWakeSales({
        ...BASE_SUMMARY,
        chainState: {
          ...emptyChain,
          codebase_understanding: "published",
          app_description: "published",
          market_analysis: "published",
          target_definition: "published",
          personas: "published",
        },
      })
    ).toBe(true);
  });

  it("does not wake when personas missing", () => {
    expect(shouldWakeSales(BASE_SUMMARY)).toBe(false);
  });
});

describe("shouldWakeValidator", () => {
  it("wakes when there is pending validation work", () => {
    expect(
      shouldWakeValidator({ ...BASE_SUMMARY, pendingValidationCount: 1 })
    ).toBe(true);
  });

  it("does not wake when no pending validation", () => {
    expect(shouldWakeValidator(BASE_SUMMARY)).toBe(false);
  });

  it("wakes regardless of chain gating (validator is always allowed)", () => {
    expect(
      shouldWakeValidator({
        ...BASE_SUMMARY,
        pendingValidationCount: 1,
        openTaskCount: 100,
      })
    ).toBe(true);
  });
});

describe("shouldWakeCEO", () => {
  it("wakes when items stuck in review", () => {
    expect(shouldWakeCEO({ ...BASE_SUMMARY, stuckReviewCount: 2 })).toBe(true);
  });

  it("wakes when recent errors exist", () => {
    expect(shouldWakeCEO({ ...BASE_SUMMARY, recentErrorCount: 3 })).toBe(true);
  });

  it("does not wake when no coordination needed", () => {
    expect(shouldWakeCEO(BASE_SUMMARY)).toBe(false);
  });
});

describe("shouldWakeSupport", () => {
  it("wakes when new conversations exist", () => {
    expect(
      shouldWakeSupport({ ...BASE_SUMMARY, newSupportConversationCount: 1 })
    ).toBe(true);
  });

  it("does not wake when no conversations", () => {
    expect(shouldWakeSupport(BASE_SUMMARY)).toBe(false);
  });
});

describe("shouldWakeDev", () => {
  it("never wakes (disabled in chain architecture)", () => {
    expect(shouldWakeDev(BASE_SUMMARY)).toBe(false);
    expect(shouldWakeDev({ ...BASE_SUMMARY, openTaskCount: 0 })).toBe(false);
  });
});
