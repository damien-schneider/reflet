import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  CHAIN_NODE_KINDS,
  CHAIN_NODE_OWNERS,
  type ChainNodeKind,
  type ChainState,
  checkNodePrecondition,
  isNodeReadyToProduce,
  ROLE_CHAIN_REQUIREMENTS,
} from "../chain";
import {
  computeBranchReviewGate,
  DEFAULT_REVIEW_GATE_LIMIT,
} from "../runtime/policy";
import { collectScheduleSignals } from "./signals";
import {
  ROLE_SKILLS,
  type RoleBlocker,
  type RoleNextAction,
  type RoleScheduleEntry,
  type RoleScheduleSignals,
  type RoleSkill,
} from "./types";

const ownedNodes = (role: RoleSkill): ChainNodeKind[] =>
  CHAIN_NODE_KINDS.filter((node) => CHAIN_NODE_OWNERS[node] === role);

const findNextProducerNode = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  role: RoleSkill,
  chainState: ChainState
): Promise<{ node: ChainNodeKind; preconditionUnmet?: string } | null> => {
  for (const node of ownedNodes(role)) {
    if (!isNodeReadyToProduce(chainState, node)) {
      continue;
    }
    const precondition = await checkNodePrecondition(ctx, orgId, node);
    if (!precondition.met) {
      return { node, preconditionUnmet: precondition.reason };
    }
    return { node };
  }
  return null;
};

const isChainProducerRole = (
  role: RoleSkill
): role is "cto" | "pm" | "growth" =>
  role === "cto" || role === "pm" || role === "growth";

const buildChainGateBlockers = (
  role: RoleSkill,
  chainState: ChainState
): RoleBlocker[] => {
  const required = ROLE_CHAIN_REQUIREMENTS[role] ?? [];
  const missing = required.filter((node) => chainState[node] !== "published");
  return missing.length === 0
    ? []
    : [{ kind: "chain_dep_missing", nodes: missing }];
};

const readyEntry = (
  role: RoleSkill,
  nextAction: RoleNextAction
): RoleScheduleEntry => ({
  role,
  state: "ready",
  nextAction,
  blockers: [],
});

const idleEntry = (role: RoleSkill): RoleScheduleEntry => ({
  role,
  state: "idle",
  nextAction: null,
  blockers: [],
});

const blockedEntry = (
  role: RoleSkill,
  blockers: RoleBlocker[]
): RoleScheduleEntry => ({
  role,
  state: "blocked",
  nextAction: null,
  blockers,
});

const taskDispatchAction = (
  task: Doc<"autopilotWorkItems">
): RoleNextAction => ({
  kind: "task_dispatch",
  taskId: task._id,
  title: task.title,
});

const reviewGateBlockerForTask = (
  task: Doc<"autopilotWorkItems">,
  signals: RoleScheduleSignals
): RoleBlocker | null => {
  const gate = computeBranchReviewGate({
    limit: DEFAULT_REVIEW_GATE_LIMIT,
    pendingReviews: signals.pendingReviewBranches,
    targetBranch: task.branch ?? null,
  });
  if (!gate.blocked) {
    return null;
  }
  return {
    kind: "review_gate",
    branch: gate.affectedBranch,
    count: gate.count,
    limit: gate.limit,
  };
};

const buildValidatorEntry = (
  signals: RoleScheduleSignals
): RoleScheduleEntry => {
  if (signals.pendingValidationCount > 0) {
    return readyEntry("validator", {
      kind: "validation_pass",
      count: signals.pendingValidationCount,
    });
  }
  return idleEntry("validator");
};

const buildSupportEntry = (signals: RoleScheduleSignals): RoleScheduleEntry => {
  if (signals.newSupportConversationCount > 0) {
    return readyEntry("support", {
      kind: "support_triage",
      count: signals.newSupportConversationCount,
    });
  }
  const pendingTask = signals.pendingTasksByRole.get("support");
  if (!pendingTask) {
    return idleEntry("support");
  }
  const reviewGate = reviewGateBlockerForTask(pendingTask, signals);
  return reviewGate
    ? blockedEntry("support", [reviewGate])
    : readyEntry("support", taskDispatchAction(pendingTask));
};

const buildCeoEntry = (signals: RoleScheduleSignals): RoleScheduleEntry => {
  if (signals.stuckReviewCount > 0) {
    return readyEntry("ceo", {
      kind: "ceo_coordination",
      reason: "stuck_reviews",
    });
  }
  if (signals.recentErrorCount > 0) {
    return readyEntry("ceo", { kind: "ceo_coordination", reason: "errors" });
  }
  return idleEntry("ceo");
};

const buildProducerEntry = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  role: "cto" | "pm" | "growth",
  signals: RoleScheduleSignals
): Promise<RoleScheduleEntry> => {
  const next = await findNextProducerNode(ctx, orgId, role, signals.chainState);
  if (next?.preconditionUnmet) {
    return blockedEntry(role, [
      {
        kind: "precondition_unmet",
        node: next.node,
        reason: next.preconditionUnmet,
      },
    ]);
  }
  if (next) {
    return readyEntry(role, { kind: "chain_producer", node: next.node });
  }
  return buildProducerFallbackEntry(role, signals);
};

const buildProducerFallbackEntry = (
  role: "cto" | "pm" | "growth",
  signals: RoleScheduleSignals
): RoleScheduleEntry => {
  const chainDepBlockers = buildChainGateBlockers(role, signals.chainState);
  if (
    role === "growth" &&
    chainDepBlockers.length === 0 &&
    signals.shippedFeaturesWithoutContent > 0
  ) {
    return readyEntry("growth", {
      kind: "growth_content",
      reason: "shipped_features",
    });
  }
  const pendingTask = signals.pendingTasksByRole.get(role);
  if (!pendingTask) {
    return idleEntry(role);
  }
  const reviewGate = reviewGateBlockerForTask(pendingTask, signals);
  if (reviewGate) {
    return blockedEntry(role, [reviewGate]);
  }
  return chainDepBlockers.length > 0
    ? blockedEntry(role, chainDepBlockers)
    : readyEntry(role, taskDispatchAction(pendingTask));
};

const buildSalesEntry = (signals: RoleScheduleSignals): RoleScheduleEntry => {
  const chainDepBlockers = buildChainGateBlockers("sales", signals.chainState);
  const pendingTask = signals.pendingTasksByRole.get("sales");
  if (pendingTask) {
    const reviewGate = reviewGateBlockerForTask(pendingTask, signals);
    if (reviewGate) {
      return blockedEntry("sales", [reviewGate]);
    }
    return chainDepBlockers.length > 0
      ? blockedEntry("sales", chainDepBlockers)
      : readyEntry("sales", taskDispatchAction(pendingTask));
  }
  if (signals.chainState.lead_targets !== "missing") {
    return idleEntry("sales");
  }
  return chainDepBlockers.length > 0
    ? blockedEntry("sales", chainDepBlockers)
    : readyEntry("sales", {
        kind: "chain_producer",
        node: "lead_targets",
      });
};

const buildScheduleForRole = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  role: RoleSkill,
  signals: RoleScheduleSignals
): Promise<RoleScheduleEntry> => {
  if (!signals.enabledSet.has(role)) {
    return blockedEntry(role, [{ kind: "role_disabled" }]);
  }
  const guardBlocker = signals.guardByRole.get(role);
  if (guardBlocker) {
    return blockedEntry(role, [guardBlocker]);
  }
  if (role === "validator") {
    return buildValidatorEntry(signals);
  }
  if (role === "support") {
    return buildSupportEntry(signals);
  }
  if (role === "ceo") {
    return buildCeoEntry(signals);
  }
  if (isChainProducerRole(role)) {
    return await buildProducerEntry(ctx, orgId, role, signals);
  }
  if (role === "sales") {
    return buildSalesEntry(signals);
  }
  return idleEntry(role);
};

export const computeRoleSchedule = async (
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  orgId: Id<"organizations">
): Promise<RoleScheduleEntry[]> => {
  const signals = await collectScheduleSignals(ctx, orgId);
  const entries: RoleScheduleEntry[] = [];
  for (const role of ROLE_SKILLS) {
    entries.push(await buildScheduleForRole(ctx, orgId, role, signals));
  }
  return entries;
};
