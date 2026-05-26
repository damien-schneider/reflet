import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ChainNodeKind, ChainState } from "../chain";
import { chainNodeKind, roleSkill } from "../schema/validators";

export type RoleSkill =
  | "cto"
  | "pm"
  | "growth"
  | "sales"
  | "ceo"
  | "support"
  | "validator";

export const ROLE_SKILLS: readonly RoleSkill[] = [
  "cto",
  "pm",
  "growth",
  "sales",
  "ceo",
  "support",
  "validator",
] as const;

export type RoleScheduleState = "ready" | "blocked" | "idle";

export type RoleBlocker =
  | { kind: "role_disabled" }
  | { kind: "billing_or_usage"; detail: string }
  | { kind: "circuit_breaker"; detail: string }
  | { kind: "chain_dep_missing"; nodes: ChainNodeKind[] }
  | { kind: "precondition_unmet"; node: ChainNodeKind; reason: string }
  | { kind: "review_gate"; branch: string | null; count: number; limit: number }
  | { kind: "awaiting_user_review"; count: number };

export type RoleNextAction =
  | { kind: "chain_producer"; node: ChainNodeKind }
  | {
      kind: "task_dispatch";
      taskId: Id<"autopilotWorkItems">;
      title: string;
    }
  | { kind: "validation_pass"; count: number }
  | { kind: "support_triage"; count: number }
  | { kind: "ceo_coordination"; reason: "errors" | "stuck_reviews" }
  | { kind: "growth_content"; reason: "shipped_features" };

export interface RoleScheduleEntry {
  blockers: RoleBlocker[];
  nextAction: RoleNextAction | null;
  role: RoleSkill;
  state: RoleScheduleState;
}

export interface RoleScheduleSignals {
  chainState: ChainState;
  enabledSet: Set<string>;
  guardByRole: Map<RoleSkill, RoleBlocker | null>;
  newSupportConversationCount: number;
  pendingReviewBranches: Array<{ branch: string | null }>;
  pendingTasksByRole: Map<RoleSkill, Doc<"autopilotWorkItems"> | undefined>;
  pendingValidationCount: number;
  recentErrorCount: number;
  shippedFeaturesWithoutContent: number;
  stuckReviewCount: number;
}

const roleStateValidator = v.union(
  v.literal("ready"),
  v.literal("blocked"),
  v.literal("idle")
);

const blockerValidator = v.union(
  v.object({ kind: v.literal("role_disabled") }),
  v.object({
    kind: v.literal("billing_or_usage"),
    detail: v.string(),
  }),
  v.object({
    kind: v.literal("circuit_breaker"),
    detail: v.string(),
  }),
  v.object({
    kind: v.literal("chain_dep_missing"),
    nodes: v.array(chainNodeKind),
  }),
  v.object({
    kind: v.literal("precondition_unmet"),
    node: chainNodeKind,
    reason: v.string(),
  }),
  v.object({
    kind: v.literal("review_gate"),
    branch: v.union(v.string(), v.null()),
    count: v.number(),
    limit: v.number(),
  }),
  v.object({
    kind: v.literal("awaiting_user_review"),
    count: v.number(),
  })
);

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

export const roleScheduleEntryValidator = v.object({
  role: roleSkill,
  state: roleStateValidator,
  nextAction: v.union(nextActionValidator, v.null()),
  blockers: v.array(blockerValidator),
});
