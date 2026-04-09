import { describe, expect, it } from "vitest";
import {
  shouldWakeCEO,
  shouldWakeCTO,
  shouldWakeDev,
  shouldWakeGrowth,
  shouldWakePM,
  shouldWakeSales,
  shouldWakeSupport,
} from "../heartbeat_conditions";

const BASE_SUMMARY = {
  approvedSpecCount: 0,
  discoveredLeadCount: 0,
  failedRunCount: 0,
  growthFollowUpNoteCount: 0,
  hasInitiatives: true,
  hasLeads: true,
  hasResearchDocs: true,
  leadsNeedingFollowUp: 0,
  newNoteCount: 0,
  newSupportConversationCount: 0,
  now: Date.now(),
  pendingGrowthContentCount: 0,
  readyStoryCount: 5,
  recentErrorCount: 0,
  recentGrowthSuccessAt: null,
  shippedFeaturesWithoutContent: 0,
  stuckReviewCount: 0,
} as const;

describe("shouldWakePM", () => {
  it("wakes when no initiatives exist (bootstrap)", () => {
    expect(shouldWakePM({ ...BASE_SUMMARY, hasInitiatives: false })).toBe(true);
  });

  it("wakes when new notes exist", () => {
    expect(shouldWakePM({ ...BASE_SUMMARY, newNoteCount: 2 })).toBe(true);
  });

  it("wakes when stories below threshold", () => {
    expect(shouldWakePM({ ...BASE_SUMMARY, readyStoryCount: 1 })).toBe(true);
  });

  it("does not wake when stories sufficient and no new input", () => {
    expect(shouldWakePM({ ...BASE_SUMMARY })).toBe(false);
  });
});

describe("shouldWakeCTO", () => {
  it("wakes when ready stories exist", () => {
    expect(shouldWakeCTO({ ...BASE_SUMMARY, readyStoryCount: 1 })).toBe(true);
  });

  it("does not wake when no ready stories", () => {
    expect(shouldWakeCTO({ ...BASE_SUMMARY, readyStoryCount: 0 })).toBe(false);
  });
});

describe("shouldWakeDev", () => {
  it("wakes when approved specs exist", () => {
    expect(shouldWakeDev({ ...BASE_SUMMARY, approvedSpecCount: 1 })).toBe(true);
  });

  it("wakes when failed runs exist", () => {
    expect(shouldWakeDev({ ...BASE_SUMMARY, failedRunCount: 2 })).toBe(true);
  });

  it("does not wake when nothing to do", () => {
    expect(shouldWakeDev({ ...BASE_SUMMARY })).toBe(false);
  });
});

describe("shouldWakeGrowth", () => {
  it("wakes when no research docs exist (bootstrap)", () => {
    expect(shouldWakeGrowth({ ...BASE_SUMMARY, hasResearchDocs: false })).toBe(
      true
    );
  });

  it("wakes when shipped features without content", () => {
    expect(
      shouldWakeGrowth({ ...BASE_SUMMARY, shippedFeaturesWithoutContent: 3 })
    ).toBe(true);
  });

  it("wakes when growth follow-up notes exist and no recent success", () => {
    expect(
      shouldWakeGrowth({ ...BASE_SUMMARY, growthFollowUpNoteCount: 2 })
    ).toBe(true);
  });

  it("does not wake for follow-up notes if growth ran recently", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        growthFollowUpNoteCount: 2,
        recentGrowthSuccessAt: Date.now() - 10 * 60 * 1000, // 10 min ago
      })
    ).toBe(false);
  });

  it("wakes for follow-up notes if growth success is older than 30 min", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        growthFollowUpNoteCount: 2,
        recentGrowthSuccessAt: Date.now() - 35 * 60 * 1000, // 35 min ago
      })
    ).toBe(true);
  });

  it("does not wake when research exists and no content gap or follow-ups", () => {
    expect(shouldWakeGrowth({ ...BASE_SUMMARY })).toBe(false);
  });

  it("does not wake for shipped features when content backlog is full", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        shippedFeaturesWithoutContent: 3,
        pendingGrowthContentCount: 10,
      })
    ).toBe(false);
  });

  it("does not wake for follow-ups when content backlog is full", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        growthFollowUpNoteCount: 2,
        pendingGrowthContentCount: 10,
      })
    ).toBe(false);
  });

  it("still wakes for bootstrap (no research docs) even when backlog full", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        hasResearchDocs: false,
        pendingGrowthContentCount: 10,
      })
    ).toBe(true);
  });

  it("wakes when content backlog is below cap", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        shippedFeaturesWithoutContent: 2,
        pendingGrowthContentCount: 5,
      })
    ).toBe(true);
  });
});

describe("shouldWakeSales", () => {
  it("wakes when no leads exist and research docs available (bootstrap)", () => {
    expect(
      shouldWakeSales({
        ...BASE_SUMMARY,
        hasLeads: false,
        hasResearchDocs: true,
      })
    ).toBe(true);
  });

  it("does not bootstrap when no research docs yet", () => {
    expect(
      shouldWakeSales({
        ...BASE_SUMMARY,
        hasLeads: false,
        hasResearchDocs: false,
      })
    ).toBe(false);
  });

  it("wakes when discovered leads exist", () => {
    expect(shouldWakeSales({ ...BASE_SUMMARY, discoveredLeadCount: 3 })).toBe(
      true
    );
  });

  it("wakes when leads need follow-up", () => {
    expect(shouldWakeSales({ ...BASE_SUMMARY, leadsNeedingFollowUp: 1 })).toBe(
      true
    );
  });

  it("does not wake when no sales work exists", () => {
    expect(shouldWakeSales({ ...BASE_SUMMARY })).toBe(false);
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
    expect(shouldWakeCEO({ ...BASE_SUMMARY })).toBe(false);
  });
});

describe("shouldWakeSupport", () => {
  it("wakes when new conversations exist", () => {
    expect(
      shouldWakeSupport({ ...BASE_SUMMARY, newSupportConversationCount: 1 })
    ).toBe(true);
  });

  it("does not wake when no conversations", () => {
    expect(shouldWakeSupport({ ...BASE_SUMMARY })).toBe(false);
  });
});
