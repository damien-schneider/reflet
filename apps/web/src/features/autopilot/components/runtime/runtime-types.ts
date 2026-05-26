import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export type RoleSkill =
  | "cto"
  | "pm"
  | "growth"
  | "sales"
  | "support"
  | "validator"
  | "ceo";

export type RuntimeStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked";
export type RoleState = "working" | "ready" | "blocked" | "idle";

export interface RuntimeAction {
  actionKind: string;
  branch: string | null;
  chainNode?: string | null;
  errorMessage: string | null;
  finishedAt: number | null;
  id: Id<"autopilotExecutions">;
  nextRetryAt: number | null;
  retryCount: number;
  role: RoleSkill;
  startedAt: number | null;
  status: RuntimeStatus;
  title: string;
  triggerReason: string;
}

export interface RuntimeBlocker {
  affectedBranch: string | null;
  count: number | null;
  ctaHref?: string;
  ctaLabel?: string;
  kind: string;
  limit: number | null;
  message: string;
}

export interface RuntimeRole {
  blockers: RuntimeBlocker[];
  currentAction: RuntimeAction | null;
  lastFailure: RuntimeAction | null;
  nextAction: unknown;
  role: RoleSkill;
  skills: string[];
  state: RoleState;
}

export interface RuntimeState {
  actions: RuntimeAction[];
  blockers: RuntimeBlocker[];
  limits: {
    cost: { capUsd: number; usedUsd: number } | null;
    dailyTasks: { max: number; resetAt: number; used: number } | null;
    review: { defaultLimit: number; pendingTotal: number };
  };
  roles: RuntimeRole[];
}
