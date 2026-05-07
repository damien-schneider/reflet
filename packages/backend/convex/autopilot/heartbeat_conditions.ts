/**
 * Heartbeat wake conditions — pure functions + data query.
 *
 * CHAIN-DRIVEN ARCHITECTURE: Agents wake ONLY when (a) the chain has a node
 * ready to produce, OR (b) urgent external work exists (support, errors).
 * Never time-based.
 *
 * Open-task threshold gates the chain: if the board has too many pending tasks,
 * we don't advance the chain — only urgent work (support, CEO triage) runs.
 */

import { v } from "convex/values";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import {
  type ChainNodeKind,
  type ChainState,
  computeChainState,
  isNodeReadyToProduce,
} from "./chain";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const QUERY_LIMIT = 200;
const DEFAULT_WAKE_THRESHOLD_OPEN_TASKS = 5;
const supportThreadMetadataSchema = z.object({
  conversationId: z.string(),
});

// ============================================
// PURE WAKE CONDITION FUNCTIONS (testable)
// ============================================

export interface ActivitySummary {
  chainState: ChainState;
  newSupportConversationCount: number;
  now: number;
  openTaskCount: number;
  pendingValidationCount: number;
  recentErrorCount: number;
  shippedFeaturesWithoutContent: number;
  stuckReviewCount: number;
  wakeThresholdOpenTasks: number;
}

export const isChainGated = (summary: ActivitySummary): boolean =>
  summary.openTaskCount >= summary.wakeThresholdOpenTasks;

const ownerWakeForChain = (
  owner: string,
  summary: ActivitySummary
): boolean => {
  if (isChainGated(summary)) {
    return false;
  }
  const ownedNodes: ChainNodeKind[] = [];
  for (const [kind, kindOwner] of Object.entries(NODE_OWNERS)) {
    if (kindOwner === owner) {
      ownedNodes.push(kind as ChainNodeKind);
    }
  }
  return ownedNodes.some((kind) =>
    isNodeReadyToProduce(summary.chainState, kind)
  );
};

const NODE_OWNERS: Record<ChainNodeKind, string> = {
  codebase_understanding: "cto",
  app_description: "cto",
  market_analysis: "growth",
  target_definition: "pm",
  personas: "pm",
  use_cases: "pm",
  lead_targets: "sales",
  community_posts: "growth",
  drafts: "growth",
};

export const shouldWakeCTO = (summary: ActivitySummary): boolean =>
  ownerWakeForChain("cto", summary);

export const shouldWakePM = (summary: ActivitySummary): boolean =>
  ownerWakeForChain("pm", summary);

export const shouldWakeGrowth = (summary: ActivitySummary): boolean => {
  if (ownerWakeForChain("growth", summary)) {
    return true;
  }
  // Shipped feature → needs distribution content
  if (!isChainGated(summary) && summary.shippedFeaturesWithoutContent > 0) {
    return true;
  }
  return false;
};

export const shouldWakeSales = (summary: ActivitySummary): boolean =>
  ownerWakeForChain("sales", summary);

export const shouldWakeValidator = (summary: ActivitySummary): boolean =>
  summary.pendingValidationCount > 0;

export const shouldWakeCEO = (summary: ActivitySummary): boolean => {
  if (summary.stuckReviewCount > 0) {
    return true;
  }
  if (summary.recentErrorCount > 0) {
    return true;
  }
  return false;
};

export const shouldWakeSupport = (summary: ActivitySummary): boolean =>
  summary.newSupportConversationCount > 0;

export const shouldWakeDev = (_summary: ActivitySummary): boolean => false;

// ============================================
// DATA — collect summary
// ============================================

const fetchOpenTaskCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<number> => {
  const todoItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "todo")
    )
    .collect();
  const inProgressItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "in_progress")
    )
    .collect();
  return todoItems.length + inProgressItems.length;
};

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
      console.warn("Invalid support thread metadata", error);
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

const fetchShippedWithoutContentCount = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  now: number
): Promise<number> => {
  const ONE_WEEK_MS = 7 * ONE_DAY_MS;
  const doneItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", orgId).eq("status", "done")
    )
    .take(QUERY_LIMIT);
  const recent = doneItems.filter((t) => now - t.updatedAt < ONE_WEEK_MS);
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

export const checkWakeConditions = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    shouldWake: v.object({
      pm: v.boolean(),
      cto: v.boolean(),
      dev: v.boolean(),
      growth: v.boolean(),
      sales: v.boolean(),
      ceo: v.boolean(),
      support: v.boolean(),
      validator: v.boolean(),
    }),
    signals: v.object({
      shippedFeaturesWithoutContent: v.boolean(),
      chainGated: v.boolean(),
      openTaskCount: v.number(),
      wakeThreshold: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
    const wakeThresholdOpenTasks =
      config?.wakeThresholdOpenTasks ?? DEFAULT_WAKE_THRESHOLD_OPEN_TASKS;

    const [
      chainState,
      openTaskCount,
      pendingValidationCount,
      newSupportConversationCount,
      stuckReviewCount,
      recentErrorCount,
      shippedFeaturesWithoutContent,
    ] = await Promise.all([
      computeChainState(ctx, args.organizationId),
      fetchOpenTaskCount(ctx, args.organizationId),
      fetchPendingValidationCount(ctx, args.organizationId),
      fetchSupportSignal(ctx, args.organizationId),
      fetchStuckReviewCount(ctx, args.organizationId, now),
      fetchRecentErrorCount(ctx, args.organizationId, now),
      fetchShippedWithoutContentCount(ctx, args.organizationId, now),
    ]);

    const summary: ActivitySummary = {
      openTaskCount,
      wakeThresholdOpenTasks,
      chainState,
      pendingValidationCount,
      newSupportConversationCount,
      stuckReviewCount,
      recentErrorCount,
      shippedFeaturesWithoutContent,
      now,
    };

    return {
      shouldWake: {
        pm: shouldWakePM(summary),
        cto: shouldWakeCTO(summary),
        dev: shouldWakeDev(summary),
        growth: shouldWakeGrowth(summary),
        sales: shouldWakeSales(summary),
        ceo: shouldWakeCEO(summary),
        support: shouldWakeSupport(summary),
        validator: shouldWakeValidator(summary),
      },
      signals: {
        shippedFeaturesWithoutContent: shippedFeaturesWithoutContent > 0,
        chainGated: isChainGated(summary),
        openTaskCount,
        wakeThreshold: wakeThresholdOpenTasks,
      },
    };
  },
});
