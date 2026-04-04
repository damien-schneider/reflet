import { describe, expect, it } from "vitest";
import {
  shouldWakeArchitect,
  shouldWakeCEO,
  shouldWakeCTO,
  shouldWakeDev,
  shouldWakeDocs,
  shouldWakeGrowth,
  shouldWakePM,
  shouldWakeSales,
  shouldWakeSecurity,
  shouldWakeSupport,
} from "../heartbeat";

const BASE_SUMMARY = {
  lastPMActivity: null,
  lastGrowthActivity: null,
  lastSalesActivity: null,
  lastSecurityActivity: null,
  lastCEOActivity: null,
  lastArchitectActivity: null,
  lastSupportActivity: null,
  lastDocsActivity: null,
  readyStoryCount: 0,
  approvedSpecCount: 0,
  failedRunCount: 0,
  newNoteCount: 0,
  newSupportConversationCount: 0,
  newPRCount: 0,
  shippedFeaturesWithoutContent: 0,
  now: Date.now(),
} as const;

describe("shouldWakePM", () => {
  it("wakes when stories below threshold", () => {
    expect(shouldWakePM({ ...BASE_SUMMARY, readyStoryCount: 1 })).toBe(true);
  });

  it("wakes when new notes exist", () => {
    expect(
      shouldWakePM({ ...BASE_SUMMARY, readyStoryCount: 5, newNoteCount: 2 })
    ).toBe(true);
  });

  it("wakes when PM has been inactive for 4+ hours", () => {
    const fourHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
    expect(
      shouldWakePM({
        ...BASE_SUMMARY,
        readyStoryCount: 5,
        lastPMActivity: fourHoursAgo,
      })
    ).toBe(true);
  });

  it("does not wake when stories sufficient and recent activity", () => {
    const recentActivity = Date.now() - 60 * 1000;
    expect(
      shouldWakePM({
        ...BASE_SUMMARY,
        readyStoryCount: 5,
        lastPMActivity: recentActivity,
      })
    ).toBe(false);
  });
});

describe("shouldWakeCTO", () => {
  it("wakes when ready stories exist", () => {
    expect(shouldWakeCTO({ ...BASE_SUMMARY, readyStoryCount: 1 })).toBe(true);
  });

  it("does not wake when no ready stories", () => {
    expect(shouldWakeCTO({ ...BASE_SUMMARY })).toBe(false);
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
  it("wakes when shipped features without content", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        shippedFeaturesWithoutContent: 3,
        lastGrowthActivity: Date.now(),
      })
    ).toBe(true);
  });

  it("wakes when research is stale (3+ days)", () => {
    const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;
    expect(
      shouldWakeGrowth({ ...BASE_SUMMARY, lastGrowthActivity: fourDaysAgo })
    ).toBe(true);
  });

  it("does not wake when recent activity and no content gap", () => {
    expect(
      shouldWakeGrowth({
        ...BASE_SUMMARY,
        lastGrowthActivity: Date.now() - 60 * 1000,
      })
    ).toBe(false);
  });
});

describe("shouldWakeSales", () => {
  it("wakes when new notes exist", () => {
    expect(shouldWakeSales({ ...BASE_SUMMARY, newNoteCount: 1 })).toBe(true);
  });

  it("wakes on daily fallback when no recent activity", () => {
    expect(shouldWakeSales({ ...BASE_SUMMARY })).toBe(true);
  });

  it("does not wake when recent activity and no notes", () => {
    expect(
      shouldWakeSales({
        ...BASE_SUMMARY,
        lastSalesActivity: Date.now() - 60 * 1000,
      })
    ).toBe(false);
  });
});

describe("shouldWakeSecurity", () => {
  it("wakes when no recent activity", () => {
    expect(shouldWakeSecurity({ ...BASE_SUMMARY })).toBe(true);
  });

  it("does not wake when scanned today", () => {
    expect(
      shouldWakeSecurity({
        ...BASE_SUMMARY,
        lastSecurityActivity: Date.now() - 60 * 1000,
      })
    ).toBe(false);
  });
});

describe("shouldWakeCEO", () => {
  it("wakes when inactive for 4+ hours", () => {
    expect(shouldWakeCEO({ ...BASE_SUMMARY })).toBe(true);
  });

  it("does not wake when recent coordination", () => {
    expect(
      shouldWakeCEO({
        ...BASE_SUMMARY,
        lastCEOActivity: Date.now() - 60 * 1000,
      })
    ).toBe(false);
  });
});

describe("shouldWakeArchitect", () => {
  it("wakes when new PRs exist", () => {
    expect(shouldWakeArchitect({ ...BASE_SUMMARY, newPRCount: 1 })).toBe(true);
  });

  it("wakes on weekly fallback", () => {
    expect(shouldWakeArchitect({ ...BASE_SUMMARY })).toBe(true);
  });
});

describe("shouldWakeSupport", () => {
  it("wakes when new conversations exist", () => {
    expect(
      shouldWakeSupport({
        ...BASE_SUMMARY,
        newSupportConversationCount: 1,
      })
    ).toBe(true);
  });

  it("wakes on daily fallback", () => {
    expect(shouldWakeSupport({ ...BASE_SUMMARY })).toBe(true);
  });
});

describe("shouldWakeDocs", () => {
  it("wakes on weekly fallback", () => {
    expect(shouldWakeDocs({ ...BASE_SUMMARY })).toBe(true);
  });

  it("does not wake when checked recently", () => {
    expect(
      shouldWakeDocs({
        ...BASE_SUMMARY,
        lastDocsActivity: Date.now() - 60 * 1000,
      })
    ).toBe(false);
  });
});
