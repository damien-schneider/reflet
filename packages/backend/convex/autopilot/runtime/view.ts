import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { CHAIN_NODE_LABELS } from "../chain";
import type { RoleBlocker } from "../schedule/types";
import {
  autopilotExecutionActionKind,
  autopilotExecutionStatus,
  autopilotExecutionTriggerReason,
  chainNodeKind,
  roleSkill,
} from "../schema/validators";
import { DEFAULT_REVIEW_GATE_LIMIT } from "./policy";

export type RoleSkill = Doc<"autopilotExecutions">["role"];
export type RuntimeStateKind = "working" | "ready" | "blocked" | "idle";
export type RuntimeBlockerKind =
  | "role_disabled"
  | "billing_or_usage"
  | "circuit_breaker"
  | "chain_dependency"
  | "precondition"
  | "review_gate";

export interface RuntimeBlocker {
  affectedBranch: string | null;
  count: number | null;
  ctaHref?: string;
  ctaLabel?: string;
  kind: RuntimeBlockerKind;
  limit: number | null;
  message: string;
}

const runtimeActionValidator = v.object({
  id: v.id("autopilotExecutions"),
  role: roleSkill,
  status: autopilotExecutionStatus,
  triggerReason: autopilotExecutionTriggerReason,
  actionKind: autopilotExecutionActionKind,
  title: v.string(),
  chainNode: v.union(chainNodeKind, v.null()),
  branch: v.union(v.string(), v.null()),
  errorMessage: v.union(v.string(), v.null()),
  retryCount: v.number(),
  nextRetryAt: v.union(v.number(), v.null()),
  startedAt: v.union(v.number(), v.null()),
  finishedAt: v.union(v.number(), v.null()),
});

const nextActionValidator = v.union(
  v.object({ kind: v.literal("chain_producer"), node: chainNodeKind }),
  v.object({
    kind: v.literal("task_dispatch"),
    taskId: v.id("autopilotWorkItems"),
    title: v.string(),
  }),
  v.object({ kind: v.literal("validation_pass"), count: v.number() }),
  v.object({ kind: v.literal("support_triage"), count: v.number() }),
  v.object({
    kind: v.literal("ceo_coordination"),
    reason: v.union(v.literal("errors"), v.literal("stuck_reviews")),
  }),
  v.object({
    kind: v.literal("growth_content"),
    reason: v.literal("shipped_features"),
  })
);

const runtimeBlockerValidator = v.object({
  kind: v.union(
    v.literal("role_disabled"),
    v.literal("billing_or_usage"),
    v.literal("circuit_breaker"),
    v.literal("chain_dependency"),
    v.literal("precondition"),
    v.literal("review_gate")
  ),
  message: v.string(),
  affectedBranch: v.union(v.string(), v.null()),
  count: v.union(v.number(), v.null()),
  limit: v.union(v.number(), v.null()),
  ctaHref: v.optional(v.string()),
  ctaLabel: v.optional(v.string()),
});

export const runtimeStateValidator = v.object({
  actions: v.array(runtimeActionValidator),
  blockers: v.array(runtimeBlockerValidator),
  limits: v.object({
    cost: v.union(
      v.object({ capUsd: v.number(), usedUsd: v.number() }),
      v.null()
    ),
    dailyTasks: v.union(
      v.object({ max: v.number(), resetAt: v.number(), used: v.number() }),
      v.null()
    ),
    review: v.object({
      defaultLimit: v.number(),
      pendingTotal: v.number(),
    }),
  }),
  roles: v.array(
    v.object({
      role: roleSkill,
      skills: v.array(v.string()),
      state: v.union(
        v.literal("working"),
        v.literal("ready"),
        v.literal("blocked"),
        v.literal("idle")
      ),
      currentAction: v.union(runtimeActionValidator, v.null()),
      nextAction: v.union(nextActionValidator, v.null()),
      blockers: v.array(runtimeBlockerValidator),
      lastFailure: v.union(runtimeActionValidator, v.null()),
    })
  ),
});

export const ROLE_SKILLS: Record<RoleSkill, string[]> = {
  ceo: ["Coordination", "Conflict detection", "Review escalation"],
  cto: ["Codebase reading", "Architecture synthesis", "Technical scope"],
  growth: ["Market research", "Content refresh", "Community discovery"],
  pm: ["Target definition", "Personas", "Use-case prioritization"],
  sales: ["Lead targeting", "Prospect briefs", "Approved outreach"],
  support: ["Conversation triage", "Reply drafting", "Customer signals"],
  validator: ["Quality scoring", "Validation gates", "Release confidence"],
};

export const ROLE_ORDER: RoleSkill[] = [
  "cto",
  "pm",
  "growth",
  "sales",
  "support",
  "validator",
  "ceo",
];

export function toRoleSkill(value: string): RoleSkill {
  if (
    value === "cto" ||
    value === "pm" ||
    value === "growth" ||
    value === "sales" ||
    value === "support" ||
    value === "validator" ||
    value === "ceo"
  ) {
    return value;
  }
  return "ceo";
}

export function formatBlocker(
  blocker: RoleBlocker,
  baseUrl: string
): RuntimeBlocker {
  if (blocker.kind === "role_disabled") {
    return blocked("role_disabled", "Disabled in settings.");
  }
  if (blocker.kind === "billing_or_usage") {
    return blocked("billing_or_usage", blocker.detail, `${baseUrl}/settings`);
  }
  if (blocker.kind === "circuit_breaker") {
    return blocked("circuit_breaker", blocker.detail);
  }
  if (blocker.kind === "chain_dep_missing") {
    return blocked(
      "chain_dependency",
      `Waiting on ${blocker.nodes.map((node) => CHAIN_NODE_LABELS[node]).join(", ")}.`
    );
  }
  if (blocker.kind === "precondition_unmet") {
    return blocked(
      "precondition",
      `${CHAIN_NODE_LABELS[blocker.node]} blocked: ${blocker.reason}`,
      `${baseUrl}/knowledge`,
      "Open knowledge"
    );
  }
  if (blocker.kind === "review_gate") {
    return {
      affectedBranch: blocker.branch,
      count: blocker.count,
      ctaHref: `${baseUrl}/inbox`,
      ctaLabel: "Review items",
      kind: "review_gate",
      limit: blocker.limit,
      message: `${blocker.branch ?? "Unbranched work"} has ${blocker.count} pending review items; limit is ${blocker.limit}.`,
    };
  }
  return {
    affectedBranch: null,
    count: blocker.count,
    ctaHref: `${baseUrl}/inbox`,
    ctaLabel: "Open inbox",
    kind: "review_gate",
    limit: DEFAULT_REVIEW_GATE_LIMIT,
    message: `Awaiting human review (${blocker.count}).`,
  };
}

const blocked = (
  kind: RuntimeBlockerKind,
  message: string,
  ctaHref?: string,
  ctaLabel = "Open settings"
): RuntimeBlocker => ({
  affectedBranch: null,
  count: null,
  ctaHref,
  ctaLabel: ctaHref ? ctaLabel : undefined,
  kind,
  limit: null,
  message,
});

export function toRuntimeAction(row: Doc<"autopilotExecutions">) {
  return {
    id: row._id,
    role: row.role,
    status: row.status,
    triggerReason: row.triggerReason,
    actionKind: row.actionKind,
    title: row.title,
    chainNode: row.chainNode ?? null,
    branch: row.branch ?? null,
    errorMessage: row.errorMessage ?? null,
    retryCount: row.retryCount,
    nextRetryAt: row.nextRetryAt ?? null,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  };
}
