/**
 * Shared types for the coding adapter abstraction layer.
 *
 * Every adapter (builtin, copilot, codex, claude_code) implements
 * the same CodingAdapter contract so the orchestrator is provider-agnostic.
 */

// ============================================
// INPUT / OUTPUT CONTRACTS
// ============================================

export interface CodingTaskInput {
  /** Structured acceptance criteria the agent must satisfy */
  acceptanceCriteria: string[];
  /** Contents of the project's AGENTS.md for coding conventions */
  agentsMdContent: string;
  /** Base branch to create the feature branch from */
  baseBranch: string;
  /** Feature branch name to use */
  featureBranch: string;
  /** Full HTTPS clone URL of the repo */
  repoUrl: string;
  /** Detailed technical spec produced by the CTO agent */
  technicalSpec: string;
  /** Human-readable task title for the PR */
  title: string;
}

export interface ActivityLogEntry {
  agent:
    | "pm"
    | "cto"
    | "dev"
    | "security"
    | "architect"
    | "growth"
    | "orchestrator"
    | "system"
    | "support"
    | "analytics"
    | "docs"
    | "qa"
    | "ops"
    | "sales";
  details?: string;
  level: "info" | "action" | "success" | "warning" | "error";
  message: string;
  timestamp: number;
}

export interface CodingTaskOutput {
  activityLogs: ActivityLogEntry[];
  branch?: string;
  errorMessage?: string;
  estimatedCostUsd: number;
  externalRef?: string;
  prNumber?: number;
  prUrl?: string;
  status: "success" | "failed" | "pending" | "cancelled";
  tokensUsed: number;
}

export interface TaskStatusResponse {
  activityLogs: ActivityLogEntry[];
  ciFailureLog?: string;
  ciStatus?: "pending" | "running" | "passed" | "failed";
  estimatedCostUsd: number;
  prNumber?: number;
  prUrl?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  tokensUsed: number;
}

// ============================================
// ADAPTER INTERFACE
// ============================================

/**
 * Every coding adapter must implement this interface.
 * The orchestrator calls executeTask, then polls getStatus until done.
 */
export interface CodingAdapter {
  /**
   * Cancel a running task. Best-effort — some adapters may not support it.
   */
  cancelTask: (
    externalRef: string,
    credentials: Record<string, string>
  ) => Promise<void>;
  /** Human-readable display name */
  readonly displayName: string;

  /**
   * Start a coding task. Returns immediately with a pending status
   * and an externalRef for tracking.
   */
  executeTask: (
    input: CodingTaskInput,
    credentials: Record<string, string>
  ) => Promise<CodingTaskOutput>;

  /**
   * Poll for task completion. Used for async adapters (Copilot, Codex).
   */
  getStatus: (
    externalRef: string,
    credentials: Record<string, string>
  ) => Promise<TaskStatusResponse>;
  /** Unique adapter identifier */
  readonly name:
    | "builtin"
    | "copilot"
    | "codex"
    | "claude_code"
    | "open_swe"
    | "openclaw";
  /** What the adapter needs in credentials JSON */
  readonly requiredCredentials: string[];

  /**
   * Validate that the provided credentials work.
   */
  validateCredentials: (
    credentials: Record<string, string>
  ) => Promise<boolean>;
}
