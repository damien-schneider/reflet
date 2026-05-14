/**
 * Health check helpers — pure functions that evaluate individual
 * aspects of autopilot health and push issues into a HealthState.
 */

const ONE_HOUR = 60 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

type HealthStatus = "critical" | "degraded" | "healthy" | "stopped";

interface HealthIssue {
  actionLabel?: string;
  actionUrl?: string;
  id: string;
  message: string;
  resolution: string;
  severity: "critical" | "info" | "warning";
}

interface HealthState {
  issues: HealthIssue[];
  status: HealthStatus;
}

function degradeTo(state: HealthState, target: HealthStatus): void {
  if (state.status === "healthy") {
    state.status = target;
  }
}

const AGENT_FIELDS = [
  "pmEnabled",
  "ctoEnabled",
  "growthEnabled",
  "supportEnabled",
  "salesEnabled",
] as const;

type AgentToggleConfig = Partial<
  Record<(typeof AGENT_FIELDS)[number], boolean>
>;

const TOTAL_AGENTS = AGENT_FIELDS.length;

function checkAutonomyMode(
  config: { autonomyMode?: string; enabled: boolean },
  state: HealthState
): void {
  if (!config.enabled || (config.autonomyMode ?? "supervised") === "stopped") {
    state.status = "stopped";
    state.issues.push({
      id: "stopped_mode",
      severity: "warning",
      message: "Autopilot is paused (stopped mode)",
      resolution: "Resume autopilot from the header controls",
    });
  }
}

function checkAgentCount(
  config: AgentToggleConfig,
  state: HealthState
): number {
  const enabledCount = AGENT_FIELDS.filter(
    (field) => config[field] !== false
  ).length;

  if (enabledCount === 0) {
    state.status = "critical";
    state.issues.push({
      id: "no_agents",
      severity: "critical",
      message: "No agents are enabled",
      resolution: "Enable at least one agent to start your autonomous team",
      actionUrl: "settings",
      actionLabel: "Enable Agents",
    });
  } else if (enabledCount <= 2) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "few_agents",
      severity: "warning",
      message: `Only ${enabledCount} of ${TOTAL_AGENTS} agents enabled`,
      resolution: "Consider enabling more agents for full coverage",
    });
  }

  return enabledCount;
}

function checkActivity(
  lastActivity: number | null,
  isStopped: boolean,
  state: HealthState
): void {
  if (isStopped) {
    return;
  }

  if (!lastActivity) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "no_activity",
      severity: "warning",
      message: "No agent activity recorded yet",
      resolution:
        "System may still be bootstrapping. Wait for the next cron tick.",
    });
    return;
  }

  if (Date.now() - lastActivity > ONE_HOUR) {
    state.issues.push({
      id: "stale_activity",
      severity: "info",
      message: "No agent activity in the last hour",
      resolution:
        "Agents are work-driven — they wake only when there's work on the board. This is normal when all tasks are complete.",
    });
  }
}

function checkStuckTasks(stuckCount: number, state: HealthState): void {
  if (stuckCount > 0) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "stuck_tasks",
      severity: "warning",
      message: `${stuckCount} task(s) stuck in progress for over 1 hour`,
      resolution: "Self-healing will auto-cancel these, or cancel manually",
      actionUrl: "tasks",
      actionLabel: "View Tasks",
    });
  }
}

function checkErrors(errorCount: number, state: HealthState): void {
  if (errorCount >= 3) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "frequent_errors",
      severity: "warning",
      message: `${errorCount} errors in the last 30 minutes`,
      resolution: "Check activity log for error details",
    });
  }
}

function checkCostCap(
  config: { costUsedTodayUsd?: number; dailyCostCapUsd?: number },
  state: HealthState
): void {
  if (!(config.dailyCostCapUsd && config.costUsedTodayUsd)) {
    return;
  }
  const usagePercent = config.costUsedTodayUsd / config.dailyCostCapUsd;
  if (usagePercent >= 1) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "cost_cap_reached",
      severity: "warning",
      message: "Daily cost cap reached — agents paused until reset",
      resolution: "Increase cost cap in Settings or wait for daily reset",
      actionUrl: "settings",
      actionLabel: "Adjust Cost Cap",
    });
  } else if (usagePercent >= 0.8) {
    state.issues.push({
      id: "cost_cap_near",
      severity: "info",
      message: `${Math.round(usagePercent * 100)}% of daily cost cap used`,
      resolution: "Monitor usage or increase cap in Settings",
    });
  }
}

function checkTaskThrottle(
  config: {
    maxTasksPerDay: number;
    tasksResetAt: number;
    tasksUsedToday: number;
  },
  state: HealthState
): void {
  if (
    Date.now() < config.tasksResetAt &&
    config.tasksUsedToday >= config.maxTasksPerDay
  ) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "task_throttle",
      severity: "warning",
      message: "Daily task dispatch limit reached",
      resolution: "Increase max tasks per day in Settings or wait for reset",
      actionUrl: "settings",
      actionLabel: "Adjust Limits",
    });
  }
}

function checkOrphanedTasks(orphanedCount: number, state: HealthState): void {
  if (orphanedCount > 0) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "orphaned_tasks",
      severity: "warning",
      message: `${orphanedCount} task(s) assigned to disabled agents`,
      resolution: "Self-healing will auto-cancel these, or enable the agents",
      actionUrl: "tasks",
      actionLabel: "View Tasks",
    });
  }
}

function checkPendingApprovals(count: number, state: HealthState): void {
  if (count > 0) {
    state.issues.push({
      id: "pending_approvals",
      severity: count >= 5 ? "warning" : "info",
      message: `${count} item${count > 1 ? "s" : ""} waiting for your approval`,
      resolution: "Review and approve or reject in Inbox to unblock agents",
      actionUrl: "inbox",
      actionLabel: "Review Inbox",
    });
  }
}

function checkPipelineCapacity(
  activeCount: number,
  totalCap: number,
  state: HealthState
): void {
  if (activeCount >= totalCap) {
    state.issues.push({
      id: "pipeline_full",
      severity: "info",
      message: `Pipeline full (${activeCount}/${totalCap}) — PM is paused`,
      resolution:
        "Complete or cancel existing tasks to free capacity for new work",
      actionUrl: "roadmap",
      actionLabel: "View Board",
    });
  }
}

type ChainNodeKind =
  | "codebase_understanding"
  | "identity"
  | "brand_voice"
  | "feature_catalog"
  | "scope"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

type ChainNodeStatus = "missing" | "draft" | "pending_review" | "published";

type ChainStateLike = Record<ChainNodeKind, ChainNodeStatus>;

interface ChainBlockerContext {
  ctoEnabled: boolean;
  githubConnected: boolean;
  hasRepoAnalysis: boolean;
  lastBlockerLogAt: number | null;
  repoAnalysisError: string | null;
}

const CHAIN_BLOCKER_LOG_STALE_MS = 6 * 60 * 60 * 1000;

function checkChainBlockers(
  chainState: ChainStateLike,
  context: ChainBlockerContext,
  state: HealthState
): void {
  const chainEmpty = Object.values(chainState).every((s) => s === "missing");
  const rootMissing = chainState.codebase_understanding === "missing";

  if (!rootMissing) {
    return;
  }

  if (!context.githubConnected) {
    state.status = "critical";
    state.issues.unshift({
      id: "chain_blocked_no_github",
      severity: "critical",
      message:
        "Autopilot is blocked: no GitHub repository connected. The chain cannot start without a codebase to analyze.",
      resolution:
        "Connect a GitHub repository in Settings → GitHub. Once connected, the CTO will produce a codebase understanding and the chain will advance automatically.",
      actionUrl: "/settings/github",
      actionLabel: "Connect Repository",
    });
    return;
  }

  if (!context.hasRepoAnalysis) {
    state.status = "critical";
    const baseMessage =
      "CTO is blocked: no repository analysis available. Codebase understanding cannot be produced yet.";
    const message = context.repoAnalysisError
      ? `${baseMessage} Last attempt failed: ${context.repoAnalysisError}`
      : baseMessage;
    const resolution = context.repoAnalysisError
      ? "Autopilot will retry automatically. If the same error keeps appearing, fix the root cause (e.g., update a stale model ID) and the next heartbeat will pick it up."
      : "Open Knowledge and click Recompute to run a repo analysis. The chain stays blocked until the analysis completes.";
    state.issues.unshift({
      id: "chain_blocked_no_repo_analysis",
      severity: "critical",
      message,
      resolution,
      actionUrl: "knowledge",
      actionLabel: "Run Repo Analysis",
    });
    return;
  }

  if (!context.ctoEnabled) {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "chain_blocked_cto_disabled",
      severity: "warning",
      message:
        "Chain root cannot advance: CTO is disabled but codebase_understanding is missing.",
      resolution:
        "Enable the CTO agent in Settings so it can produce the first chain artifact.",
      actionUrl: "settings",
      actionLabel: "Enable CTO",
    });
    return;
  }

  if (chainEmpty && context.lastBlockerLogAt) {
    const ageMs = Date.now() - context.lastBlockerLogAt;
    if (ageMs < CHAIN_BLOCKER_LOG_STALE_MS) {
      degradeTo(state, "degraded");
      state.issues.push({
        id: "chain_blocker_logged",
        severity: "warning",
        message:
          "Recent chain producer failure logged. Check the activity log for details.",
        resolution:
          "Open Activity to see the agent log — the CTO or another producer reported a blocker within the last few hours.",
        actionUrl: "activity",
        actionLabel: "View Activity",
      });
    }
  }
}

function checkCredentials(
  credentialStatus: "missing" | "invalid" | "valid",
  adapterName: string,
  state: HealthState
): void {
  if (credentialStatus === "missing") {
    state.status = "critical";
    state.issues.unshift({
      id: "credentials_missing",
      severity: "critical",
      message: `No credentials configured for "${adapterName}" adapter — agents cannot execute tasks`,
      resolution: "Add your API keys in Settings to enable task execution",
      actionUrl: "settings",
      actionLabel: "Configure Credentials",
    });
  } else if (credentialStatus === "invalid") {
    degradeTo(state, "degraded");
    state.issues.push({
      id: "credentials_invalid",
      severity: "warning",
      message: "Adapter credentials are invalid or expired",
      resolution: "Update your API keys in Settings",
      actionUrl: "settings",
      actionLabel: "Update Credentials",
    });
  }
}

export type { ChainBlockerContext, ChainStateLike, HealthState };
export {
  AGENT_FIELDS,
  checkActivity,
  checkAgentCount,
  checkAutonomyMode,
  checkChainBlockers,
  checkCostCap,
  checkCredentials,
  checkErrors,
  checkOrphanedTasks,
  checkPendingApprovals,
  checkPipelineCapacity,
  checkStuckTasks,
  checkTaskThrottle,
  ONE_HOUR,
  THIRTY_MINUTES,
  TOTAL_AGENTS,
};
