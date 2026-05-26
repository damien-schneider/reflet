import { z } from "zod";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { getEffectiveTier } from "../../billing/effective_tier";
import { computeChainState } from "../chain";
import {
  ROLE_SKILLS,
  type RoleBlocker,
  type RoleScheduleSignals,
  type RoleSkill,
} from "./types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const QUERY_LIMIT = 200;
const MAX_EXECUTIONS_PER_HOUR = 10;
const CIRCUIT_BREAKER_FAILURES = 5;
const CIRCUIT_BREAKER_WINDOW_MS = 10 * 60 * 1000;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30 * 60 * 1000;

const supportThreadMetadataSchema = z.object({
  conversationId: z.string(),
});

const fetchPendingValidationCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<number> => {
  const pendingDocs = await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "pending_review")
    )
    .take(QUERY_LIMIT);
  const docsNeedingScoring = pendingDocs.filter((d) => !d.validation).length;

  const pendingUseCases = await ctx.db
    .query("autopilotUseCases")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "pending_review")
    )
    .take(QUERY_LIMIT);
  const useCasesNeedingScoring = pendingUseCases.filter(
    (u) => !u.validation
  ).length;

  const communityPosts = await ctx.db
    .query("autopilotCommunityPosts")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(QUERY_LIMIT);
  const communityPostsNeedingScoring = communityPosts.filter(
    (post) => !post.validation
  ).length;

  return (
    docsNeedingScoring + useCasesNeedingScoring + communityPostsNeedingScoring
  );
};

const fetchSupportSignal = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<number> => {
  const recentCutoff = Date.now() - ONE_DAY_MS;
  const conversations = await ctx.db
    .query("supportConversations")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "open")
    )
    .take(QUERY_LIMIT);

  const recentOpenConversations = conversations.filter(
    (conversation) => conversation.lastMessageAt >= recentCutoff
  );
  if (recentOpenConversations.length === 0) {
    return 0;
  }

  const supportDrafts = await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", orgId).eq("type", "support_thread")
    )
    .take(QUERY_LIMIT);

  const triagedConversationIds = new Set<string>();
  for (const draft of supportDrafts) {
    if (!draft.metadata) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(draft.metadata);
      const metadata = supportThreadMetadataSchema.safeParse(parsed);
      if (metadata.success) {
        triagedConversationIds.add(metadata.data.conversationId);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        continue;
      }
      throw error;
    }
  }

  return recentOpenConversations.filter(
    (conversation) => !triagedConversationIds.has(conversation._id)
  ).length;
};

const fetchStuckReviewCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  now: number
): Promise<number> => {
  const reviewItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_review", (q) =>
      q.eq("organizationId", orgId).eq("needsReview", true)
    )
    .take(QUERY_LIMIT);
  return reviewItems.filter((item) => now - item.updatedAt > ONE_DAY_MS).length;
};

const fetchRecentErrorCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  now: number
): Promise<number> => {
  const recentActivity = await ctx.db
    .query("autopilotActivityLog")
    .withIndex("by_org_created", (q) => q.eq("organizationId", orgId))
    .order("desc")
    .take(100);
  return recentActivity.filter(
    (a) => a.level === "error" && now - a.createdAt < ONE_DAY_MS
  ).length;
};

const fetchPendingReviewBranches = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<Array<{ branch: string | null }>> => {
  const needsReviewRows = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_review", (q) =>
      q.eq("organizationId", orgId).eq("needsReview", true)
    )
    .take(QUERY_LIMIT);
  const inReviewRows = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "in_review")
    )
    .take(QUERY_LIMIT);

  const seen = new Set<string>();
  const result: Array<{ branch: string | null }> = [];
  for (const item of [...needsReviewRows, ...inReviewRows]) {
    if (seen.has(item._id)) {
      continue;
    }
    seen.add(item._id);
    result.push({ branch: item.branch ?? null });
  }
  return result;
};

const fetchShippedWithoutContentCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  now: number
): Promise<number> => {
  const oneWeekMs = 7 * ONE_DAY_MS;
  const doneItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "done")
    )
    .take(QUERY_LIMIT);
  const recent = doneItems.filter((t) => now - t.updatedAt < oneWeekMs);
  let count = 0;
  for (const item of recent.slice(0, 20)) {
    const linkedDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_linked_work", (q) => q.eq("linkedWorkItemId", item._id))
      .take(1);
    if (linkedDocs.length === 0) {
      count++;
    }
  }
  return count;
};

const ROLE_CONFIG_FIELDS: ReadonlyArray<{
  role: RoleSkill;
  defaultEnabled: boolean;
  field: keyof Doc<"autopilotConfig">;
}> = [
  { role: "pm", field: "pmEnabled", defaultEnabled: true },
  { role: "cto", field: "ctoEnabled", defaultEnabled: true },
  { role: "growth", field: "growthEnabled", defaultEnabled: false },
  { role: "support", field: "supportEnabled", defaultEnabled: false },
  { role: "sales", field: "salesEnabled", defaultEnabled: false },
];

const enabledRoleSet = (config: Doc<"autopilotConfig"> | null): Set<string> => {
  const set = new Set<string>();
  if (!config?.enabled || (config.autonomyMode ?? "supervised") === "stopped") {
    return set;
  }
  for (const { role, field, defaultEnabled } of ROLE_CONFIG_FIELDS) {
    const value = config[field];
    const enabled = value === undefined ? defaultEnabled : value;
    if (enabled === true) {
      set.add(role);
    }
  }
  set.add("ceo");
  set.add("validator");
  return set;
};

const computeGuardBlocker = (
  role: RoleSkill,
  config: Doc<"autopilotConfig"> | null,
  tier: "free" | "pro",
  recentActivity: Doc<"autopilotActivityLog">[]
): RoleBlocker | null => {
  if (!config) {
    return { kind: "billing_or_usage", detail: "No autopilot config" };
  }
  if (tier !== "pro") {
    return {
      kind: "billing_or_usage",
      detail: "Autopilot requires a Pro subscription",
    };
  }
  const dailyCap = config.dailyCostCapUsd ?? 0;
  const costUsed = config.costUsedTodayUsd ?? 0;
  if (dailyCap > 0 && costUsed >= dailyCap) {
    return {
      kind: "billing_or_usage",
      detail: `Daily cost cap reached ($${costUsed.toFixed(2)} / $${dailyCap.toFixed(2)})`,
    };
  }
  if (
    Date.now() < config.tasksResetAt &&
    config.tasksUsedToday >= config.maxTasksPerDay
  ) {
    return {
      kind: "billing_or_usage",
      detail: `Daily task limit reached (${config.tasksUsedToday} / ${config.maxTasksPerDay})`,
    };
  }
  const now = Date.now();
  const roleActivity = recentActivity.filter(
    (entry) => entry.role === role && entry.createdAt > now - 60 * 60 * 1000
  );
  const roleExecutions = roleActivity.filter(
    (entry) => entry.level === "action"
  );
  if (roleExecutions.length >= MAX_EXECUTIONS_PER_HOUR) {
    return {
      kind: "billing_or_usage",
      detail: `Rate limit: ${roleExecutions.length} executions in last hour`,
    };
  }
  const recentErrors = roleActivity.filter(
    (entry) =>
      entry.level === "error" &&
      entry.createdAt > now - CIRCUIT_BREAKER_WINDOW_MS
  );
  const lastError = recentErrors[0];
  if (
    recentErrors.length >= CIRCUIT_BREAKER_FAILURES &&
    lastError &&
    now - lastError.createdAt < CIRCUIT_BREAKER_COOLDOWN_MS
  ) {
    return {
      kind: "circuit_breaker",
      detail: `${recentErrors.length} errors in ${CIRCUIT_BREAKER_WINDOW_MS / 60_000}min; cooling down`,
    };
  }
  return null;
};

type DispatchableTaskRole = "cto" | "growth" | "sales" | "support";

const isDispatchableTaskRole = (
  role: RoleSkill
): role is DispatchableTaskRole =>
  role === "cto" || role === "growth" || role === "sales" || role === "support";

const toRoleSkill = (
  value: Doc<"autopilotWorkItems">["assignedRole"] | undefined
): RoleSkill | null => {
  if (
    value === "cto" ||
    value === "pm" ||
    value === "growth" ||
    value === "sales" ||
    value === "ceo" ||
    value === "support" ||
    value === "validator"
  ) {
    return value;
  }
  return null;
};

const fetchPendingTasksByRole = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<Map<RoleSkill, Doc<"autopilotWorkItems">>> => {
  const todoItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "todo")
    )
    .take(QUERY_LIMIT);
  const byRole = new Map<RoleSkill, Doc<"autopilotWorkItems">>();
  for (const task of todoItems) {
    const role = toRoleSkill(task.assignedRole);
    if (role && isDispatchableTaskRole(role) && !byRole.has(role)) {
      byRole.set(role, task);
    }
  }
  return byRole;
};

export const collectScheduleSignals = async (
  ctx: Pick<QueryCtx, "db" | "runQuery">,
  orgId: Id<"organizations">
): Promise<RoleScheduleSignals> => {
  const now = Date.now();
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  const chainState = await computeChainState(ctx, orgId);
  const pendingValidationCount = await fetchPendingValidationCount(ctx, orgId);
  const newSupportConversationCount = await fetchSupportSignal(ctx, orgId);
  const stuckReviewCount = await fetchStuckReviewCount(ctx, orgId, now);
  const pendingReviewBranches = await fetchPendingReviewBranches(ctx, orgId);
  const recentErrorCount = await fetchRecentErrorCount(ctx, orgId, now);
  const shippedFeaturesWithoutContent = await fetchShippedWithoutContentCount(
    ctx,
    orgId,
    now
  );
  const pendingTasksByRole = await fetchPendingTasksByRole(ctx, orgId);
  const recentActivity = await ctx.db
    .query("autopilotActivityLog")
    .withIndex("by_org_created", (q) => q.eq("organizationId", orgId))
    .order("desc")
    .take(200);
  const tier = await getEffectiveTier(ctx, orgId);

  const guardByRole = new Map<RoleSkill, RoleBlocker | null>();
  for (const role of ROLE_SKILLS) {
    guardByRole.set(
      role,
      computeGuardBlocker(role, config, tier, recentActivity)
    );
  }

  return {
    chainState,
    enabledSet: enabledRoleSet(config),
    guardByRole,
    newSupportConversationCount,
    pendingReviewBranches,
    pendingTasksByRole,
    pendingValidationCount,
    recentErrorCount,
    shippedFeaturesWithoutContent,
    stuckReviewCount,
  };
};
