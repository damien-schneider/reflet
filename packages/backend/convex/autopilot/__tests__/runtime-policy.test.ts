/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import {
  canDispatchFromExecutionState,
  computeBranchReviewGate,
  resolveDeliverableFreshness,
  resolveRefreshBehavior,
} from "../runtime/policy";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("runtime policy — branch-aware review gates", () => {
  test("blocks only the branch that reached the pending-review limit", () => {
    const gate = computeBranchReviewGate({
      limit: 5,
      pendingReviews: [
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/onboarding" },
      ],
      targetBranch: "feature/onboarding",
    });

    expect(gate.blocked).toBe(false);
    expect(gate.affectedBranch).toBe("feature/onboarding");
    expect(gate.count).toBe(1);
    expect(gate.limit).toBe(5);
  });

  test("reports the exact blocking branch and count when the branch is over limit", () => {
    const gate = computeBranchReviewGate({
      limit: 5,
      pendingReviews: [
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
        { branch: "feature/checkout" },
      ],
      targetBranch: "feature/checkout",
    });

    expect(gate).toEqual({
      affectedBranch: "feature/checkout",
      blocked: true,
      count: 6,
      limit: 5,
    });
  });
});

describe("runtime policy — codebase-derived freshness", () => {
  test("marks a deliverable stale at one hundred new commits", () => {
    const freshness = resolveDeliverableFreshness({
      commitsSinceSource: 100,
      generatedAt: Date.now(),
      now: Date.now(),
    });

    expect(freshness).toEqual({
      kind: "stale",
      reason: "commit_threshold",
      summary: "100 new commits since the last generated version",
    });
  });

  test("marks a deliverable stale after seven days when at least one commit changed", () => {
    const now = Date.now();
    const freshness = resolveDeliverableFreshness({
      commitsSinceSource: 1,
      generatedAt: now - 7 * DAY_MS,
      now,
    });

    expect(freshness.kind).toBe("stale");
    expect(freshness.reason).toBe("age_with_new_commit");
  });

  test("does not refresh only because time passed when no commits changed", () => {
    const now = Date.now();
    const freshness = resolveDeliverableFreshness({
      commitsSinceSource: 0,
      generatedAt: now - 14 * DAY_MS,
      now,
    });

    expect(freshness).toEqual({
      kind: "current",
      reason: null,
      summary: "Current",
    });
  });
});

describe("runtime policy — refresh behavior by autonomy mode", () => {
  test("supervised refresh creates a pending-review replacement draft", () => {
    expect(
      resolveRefreshBehavior({
        autonomyMode: "supervised",
        validationSucceeded: false,
      })
    ).toEqual({
      canonicalReplacement: false,
      createPendingReviewDraft: true,
      generationAllowed: true,
    });
  });

  test("full auto only replaces canonical output after validation succeeds", () => {
    expect(
      resolveRefreshBehavior({
        autonomyMode: "full_auto",
        validationSucceeded: false,
      }).canonicalReplacement
    ).toBe(false);

    expect(
      resolveRefreshBehavior({
        autonomyMode: "full_auto",
        validationSucceeded: true,
      })
    ).toEqual({
      canonicalReplacement: true,
      createPendingReviewDraft: false,
      generationAllowed: true,
    });
  });

  test("stopped mode exposes state without allowing generation", () => {
    expect(
      resolveRefreshBehavior({
        autonomyMode: "stopped",
        validationSucceeded: true,
      })
    ).toEqual({
      canonicalReplacement: false,
      createPendingReviewDraft: false,
      generationAllowed: false,
    });
  });
});

describe("runtime policy — durable executions drive dispatch", () => {
  test("running executions block redispatch even when activity logs look terminal", () => {
    expect(
      canDispatchFromExecutionState({
        activeExecutionStatus: "running",
        activityLogHasOpenAction: false,
      })
    ).toBe(false);
  });

  test("activity-log gaps do not block dispatch when no active execution exists", () => {
    expect(
      canDispatchFromExecutionState({
        activeExecutionStatus: null,
        activityLogHasOpenAction: true,
      })
    ).toBe(true);
  });
});
