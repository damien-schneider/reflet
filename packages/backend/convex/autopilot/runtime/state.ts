import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { computeRoleSchedule } from "../schedule/build";
import { computeBranchReviewGate, DEFAULT_REVIEW_GATE_LIMIT } from "./policy";
import {
  formatBlocker,
  ROLE_ORDER,
  ROLE_SKILLS,
  type RoleSkill,
  type RuntimeBlocker,
  type RuntimeStateKind,
  toRuntimeAction,
} from "./view";

const fetchPendingReviewItems = async (
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
) => {
  const needsReviewRows = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_review", (q) =>
      q.eq("organizationId", organizationId).eq("needsReview", true)
    )
    .collect();
  const inReviewRows = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "in_review")
    )
    .collect();

  const seen = new Set<string>();
  const rows: Doc<"autopilotWorkItems">[] = [];
  for (const row of [...needsReviewRows, ...inReviewRows]) {
    if (!seen.has(row._id)) {
      seen.add(row._id);
      rows.push(row);
    }
  }
  return rows;
};

const buildRoleRows = (
  schedule: Awaited<ReturnType<typeof computeRoleSchedule>>,
  executions: Doc<"autopilotExecutions">[],
  baseUrl: string
) => {
  const activeByRole = new Map<RoleSkill, Doc<"autopilotExecutions">>();
  const failureByRole = new Map<RoleSkill, Doc<"autopilotExecutions">>();
  for (const execution of executions) {
    if (
      (execution.status === "queued" || execution.status === "running") &&
      !activeByRole.has(execution.role)
    ) {
      activeByRole.set(execution.role, execution);
    }
    if (execution.status === "failed" && !failureByRole.has(execution.role)) {
      failureByRole.set(execution.role, execution);
    }
  }

  const scheduleByRole = new Map(schedule.map((entry) => [entry.role, entry]));
  return ROLE_ORDER.map((role) => {
    const active = activeByRole.get(role);
    const entry = scheduleByRole.get(role);
    const lastFailure = failureByRole.get(role);
    const state: RuntimeStateKind = active
      ? "working"
      : (entry?.state ?? "idle");
    return {
      role,
      skills: ROLE_SKILLS[role],
      state,
      currentAction: active ? toRuntimeAction(active) : null,
      nextAction: entry?.nextAction ?? null,
      blockers: (entry?.blockers ?? []).map((blocker) =>
        formatBlocker(blocker, baseUrl)
      ),
      lastFailure: lastFailure ? toRuntimeAction(lastFailure) : null,
    };
  });
};

const buildReviewBlockers = (
  pendingReviewItems: Doc<"autopilotWorkItems">[],
  baseUrl: string
): RuntimeBlocker[] => {
  const blockers: RuntimeBlocker[] = [];
  const branchNames = new Set(
    pendingReviewItems.map((item) => item.branch ?? null)
  );
  for (const branch of branchNames) {
    const gate = computeBranchReviewGate({
      limit: DEFAULT_REVIEW_GATE_LIMIT,
      pendingReviews: pendingReviewItems.map((item) => ({
        branch: item.branch ?? null,
      })),
      targetBranch: branch,
    });
    if (gate.blocked) {
      blockers.push({
        affectedBranch: gate.affectedBranch,
        count: gate.count,
        ctaHref: `${baseUrl}/inbox`,
        ctaLabel: "Review items",
        kind: "review_gate",
        limit: gate.limit,
        message: `${gate.affectedBranch ?? "Unbranched work"} has ${gate.count} pending review items; limit is ${gate.limit}.`,
      });
    }
  }
  return blockers;
};

export async function buildRuntimeState(
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  organizationId: Id<"organizations">,
  baseUrl: string
) {
  const [schedule, config, pendingReviewItems, executions] = await Promise.all([
    computeRoleSchedule(ctx, organizationId),
    ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique(),
    fetchPendingReviewItems(ctx, organizationId),
    ctx.db
      .query("autopilotExecutions")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .take(50),
  ]);

  return {
    actions: executions.map(toRuntimeAction),
    blockers: buildReviewBlockers(pendingReviewItems, baseUrl),
    limits: {
      cost:
        config?.dailyCostCapUsd === undefined
          ? null
          : {
              capUsd: config.dailyCostCapUsd,
              usedUsd: config.costUsedTodayUsd ?? 0,
            },
      dailyTasks: config
        ? {
            max: config.maxTasksPerDay,
            resetAt: config.tasksResetAt,
            used: config.tasksUsedToday,
          }
        : null,
      review: {
        defaultLimit: DEFAULT_REVIEW_GATE_LIMIT,
        pendingTotal: pendingReviewItems.length,
      },
    },
    roles: buildRoleRows(schedule, executions, baseUrl),
  };
}
