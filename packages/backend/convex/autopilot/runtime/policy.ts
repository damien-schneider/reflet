export type ExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked";

export type AutonomyMode = "supervised" | "full_auto" | "stopped";

export type FreshnessReason = "commit_threshold" | "age_with_new_commit";

export type DeliverableFreshness =
  | { kind: "current"; reason: null; summary: "Current" }
  | { kind: "stale"; reason: FreshnessReason; summary: string };

export interface FreshnessInput {
  commitsSinceSource: number;
  generatedAt: number | null;
  now: number;
}

export interface RefreshBehaviorInput {
  autonomyMode: AutonomyMode;
  validationSucceeded: boolean;
}

export interface RefreshBehavior {
  canonicalReplacement: boolean;
  createPendingReviewDraft: boolean;
  generationAllowed: boolean;
}

export interface PendingBranchReview {
  branch: string | null;
}

export interface BranchReviewGateInput {
  limit: number;
  pendingReviews: PendingBranchReview[];
  targetBranch: string | null;
}

export interface BranchReviewGate {
  affectedBranch: string | null;
  blocked: boolean;
  count: number;
  limit: number;
}

export interface DispatchStateInput {
  activeExecutionStatus: ExecutionStatus | null;
  activityLogHasOpenAction: boolean;
}

export interface ExecutionRetryDelayInput {
  maxRetries?: number;
  retryCount: number;
}

const STALE_COMMIT_THRESHOLD = 100;
const STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_RETRY_DELAY_MS = 5 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 2;

export const DEFAULT_REVIEW_GATE_LIMIT = 5;

const normalizeBranch = (branch: string | null): string | null => {
  if (!branch) {
    return null;
  }
  const trimmed = branch.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function computeBranchReviewGate({
  limit,
  pendingReviews,
  targetBranch,
}: BranchReviewGateInput): BranchReviewGate {
  const normalizedTarget = normalizeBranch(targetBranch);
  let count = 0;
  for (const review of pendingReviews) {
    if (normalizeBranch(review.branch) === normalizedTarget) {
      count += 1;
    }
  }

  return {
    affectedBranch: normalizedTarget,
    blocked: count >= limit,
    count,
    limit,
  };
}

export function resolveDeliverableFreshness({
  commitsSinceSource,
  generatedAt,
  now,
}: FreshnessInput): DeliverableFreshness {
  if (commitsSinceSource >= STALE_COMMIT_THRESHOLD) {
    return {
      kind: "stale",
      reason: "commit_threshold",
      summary: `${commitsSinceSource} new commits since the last generated version`,
    };
  }

  if (
    generatedAt !== null &&
    commitsSinceSource > 0 &&
    now - generatedAt >= STALE_AGE_MS
  ) {
    return {
      kind: "stale",
      reason: "age_with_new_commit",
      summary:
        "At least one new commit landed and the generated version is seven days old",
    };
  }

  return { kind: "current", reason: null, summary: "Current" };
}

export function resolveRefreshBehavior({
  autonomyMode,
  validationSucceeded,
}: RefreshBehaviorInput): RefreshBehavior {
  if (autonomyMode === "stopped") {
    return {
      canonicalReplacement: false,
      createPendingReviewDraft: false,
      generationAllowed: false,
    };
  }

  if (autonomyMode === "supervised") {
    return {
      canonicalReplacement: false,
      createPendingReviewDraft: true,
      generationAllowed: true,
    };
  }

  return {
    canonicalReplacement: validationSucceeded,
    createPendingReviewDraft: false,
    generationAllowed: true,
  };
}

export function canDispatchFromExecutionState({
  activeExecutionStatus,
}: DispatchStateInput): boolean {
  return (
    activeExecutionStatus !== "queued" && activeExecutionStatus !== "running"
  );
}

export function resolveExecutionRetryDelayMs({
  maxRetries = DEFAULT_MAX_RETRIES,
  retryCount,
}: ExecutionRetryDelayInput): number | null {
  const nextRetryCount = retryCount + 1;
  return nextRetryCount <= maxRetries
    ? nextRetryCount * BASE_RETRY_DELAY_MS
    : null;
}
