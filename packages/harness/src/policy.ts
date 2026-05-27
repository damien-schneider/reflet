export type RecipeRunDecision =
  | { reason: "manual_request"; shouldRun: true }
  | { reason: "failed_validation"; shouldRun: true }
  | { reason: "missing_previous_run"; shouldRun: true }
  | { reason: "input_changed"; shouldRun: true }
  | { reason: "new_evidence"; shouldRun: true }
  | { reason: "output_changed"; shouldRun: true }
  | { reason: "unchanged"; shouldRun: false };

export interface RecipeRunDecisionInput {
  currentInputHashes: Record<string, string>;
  failedValidation: boolean;
  manualRequest: boolean;
  newEvidence: boolean;
  previousInputHashes: Record<string, string> | null;
  previousOutputHash: string | null;
  producedOutputHash: string | null;
}

export type HarnessGuardReason =
  | "approval_cap_reached"
  | "pr_cap_reached"
  | "noop_loop_detected"
  | "validator_loop_detected"
  | "bridge_offline"
  | "claude_unavailable"
  | "dirty_worktree";

export type HarnessGuardResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: HarnessGuardReason };

export interface HarnessGuardInput {
  bridgeOnline: boolean;
  claudeAvailable: boolean;
  consecutiveNoopRuns: number;
  consecutiveValidatorFailures: number;
  openRefletPrs: number;
  pendingApprovals: number;
  worktreeClean: boolean;
}

const APPROVAL_LIMIT = 5;
const OPEN_PR_LIMIT = 3;
const NOOP_LIMIT = 2;
const VALIDATOR_FAILURE_LIMIT = 2;

function hashesMatch(
  currentHashes: Record<string, string>,
  previousHashes: Record<string, string>
): boolean {
  const currentEntries = Object.entries(currentHashes);
  if (currentEntries.length !== Object.keys(previousHashes).length) {
    return false;
  }
  return currentEntries.every(([key, value]) => previousHashes[key] === value);
}

export function resolveRecipeRunDecision({
  currentInputHashes,
  failedValidation,
  manualRequest,
  newEvidence,
  previousInputHashes,
  previousOutputHash,
  producedOutputHash,
}: RecipeRunDecisionInput): RecipeRunDecision {
  if (manualRequest) {
    return { reason: "manual_request", shouldRun: true };
  }
  if (failedValidation) {
    return { reason: "failed_validation", shouldRun: true };
  }
  if (!previousInputHashes) {
    return { reason: "missing_previous_run", shouldRun: true };
  }
  if (!hashesMatch(currentInputHashes, previousInputHashes)) {
    return { reason: "input_changed", shouldRun: true };
  }
  if (newEvidence) {
    return { reason: "new_evidence", shouldRun: true };
  }
  if (
    producedOutputHash !== null &&
    previousOutputHash !== null &&
    producedOutputHash !== previousOutputHash
  ) {
    return { reason: "output_changed", shouldRun: true };
  }
  return { reason: "unchanged", shouldRun: false };
}

export function evaluateHarnessGuards({
  bridgeOnline,
  claudeAvailable,
  consecutiveNoopRuns,
  consecutiveValidatorFailures,
  openRefletPrs,
  pendingApprovals,
  worktreeClean,
}: HarnessGuardInput): HarnessGuardResult {
  if (pendingApprovals >= APPROVAL_LIMIT) {
    return { allowed: false, reason: "approval_cap_reached" };
  }
  if (openRefletPrs >= OPEN_PR_LIMIT) {
    return { allowed: false, reason: "pr_cap_reached" };
  }
  if (consecutiveNoopRuns >= NOOP_LIMIT) {
    return { allowed: false, reason: "noop_loop_detected" };
  }
  if (consecutiveValidatorFailures >= VALIDATOR_FAILURE_LIMIT) {
    return { allowed: false, reason: "validator_loop_detected" };
  }
  if (!bridgeOnline) {
    return { allowed: false, reason: "bridge_offline" };
  }
  if (!claudeAvailable) {
    return { allowed: false, reason: "claude_unavailable" };
  }
  if (!worktreeClean) {
    return { allowed: false, reason: "dirty_worktree" };
  }
  return { allowed: true, reason: null };
}
