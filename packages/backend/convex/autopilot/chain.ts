/**
 * Chain orchestration — DAG of canonical artifacts.
 *
 * Each node owns a single document type or table. Downstream nodes can only
 * be produced when their upstream dependencies are `published`. The chain is
 * the single source of truth for "what should happen next" in the autopilot.
 *
 * No time-based triggers — every node advancement is condition-based, gated
 * by upstream state and the open-task threshold.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { chainNodeStatus } from "./schema/validators";

const chainStateValidator = v.object({
  codebase_understanding: chainNodeStatus,
  app_description: chainNodeStatus,
  market_analysis: chainNodeStatus,
  target_definition: chainNodeStatus,
  personas: chainNodeStatus,
  use_cases: chainNodeStatus,
  lead_targets: chainNodeStatus,
  community_posts: chainNodeStatus,
  drafts: chainNodeStatus,
});

const DEFAULT_WAKE_THRESHOLD_OPEN_TASKS = 5;

export type ChainNodeKind =
  | "codebase_understanding"
  | "app_description"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

export type ChainNodeStatus =
  | "missing"
  | "draft"
  | "pending_review"
  | "published";

export type ChainState = Record<ChainNodeKind, ChainNodeStatus>;

const CHAIN_NODE_KINDS: ChainNodeKind[] = [
  "codebase_understanding",
  "app_description",
  "market_analysis",
  "target_definition",
  "personas",
  "use_cases",
  "lead_targets",
  "community_posts",
  "drafts",
];

const DAG_EDGES: Partial<Record<ChainNodeKind, ChainNodeKind[]>> = {
  codebase_understanding: [],
  app_description: ["codebase_understanding"],
  market_analysis: ["app_description"],
  target_definition: ["market_analysis"],
  personas: ["target_definition"],
  use_cases: ["personas"],
  lead_targets: ["personas"],
  community_posts: ["personas", "use_cases"],
  drafts: ["community_posts"],
};

const DRAFT_DOC_TYPES = [
  "blog_post",
  "reddit_reply",
  "linkedin_post",
  "twitter_post",
  "hn_comment",
  "email",
  "changelog",
] as const;

const DOC_TYPE_BY_NODE: Partial<
  Record<ChainNodeKind, Doc<"autopilotDocuments">["type"]>
> = {
  codebase_understanding: "codebase_understanding",
  app_description: "app_description",
  market_analysis: "market_research",
  target_definition: "target_definition",
};

const docStatusToNodeStatus = (
  status: Doc<"autopilotDocuments">["status"]
): ChainNodeStatus => {
  if (status === "published") {
    return "published";
  }
  if (status === "pending_review") {
    return "pending_review";
  }
  if (status === "draft") {
    return "draft";
  }
  return "missing";
};

const aggregateNodeStatus = (statuses: ChainNodeStatus[]): ChainNodeStatus => {
  if (statuses.length === 0) {
    return "missing";
  }
  if (statuses.some((s) => s === "published")) {
    return "published";
  }
  if (statuses.some((s) => s === "pending_review")) {
    return "pending_review";
  }
  if (statuses.some((s) => s === "draft")) {
    return "draft";
  }
  return "missing";
};

const fetchDocNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  docType: Doc<"autopilotDocuments">["type"]
): Promise<ChainNodeStatus> => {
  const docs = await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", orgId).eq("type", docType)
    )
    .take(50);
  return aggregateNodeStatus(docs.map((d) => docStatusToNodeStatus(d.status)));
};

const fetchPersonasNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const personas = await ctx.db
    .query("autopilotPersonas")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(1);
  return personas.length > 0 ? "published" : "missing";
};

const useCaseStatusToNode = (
  status: "draft" | "pending_review" | "published" | "archived"
): ChainNodeStatus => (status === "archived" ? "missing" : status);

const fetchUseCasesNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const useCases = await ctx.db
    .query("autopilotUseCases")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(50);
  return aggregateNodeStatus(
    useCases.map((u) => useCaseStatusToNode(u.status))
  );
};

const fetchLeadTargetsNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const leads = await ctx.db
    .query("autopilotLeads")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(1);
  return leads.length > 0 ? "published" : "missing";
};

const fetchCommunityPostsNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const posts = await ctx.db
    .query("autopilotCommunityPosts")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(1);
  return posts.length > 0 ? "published" : "missing";
};

const fetchDraftsNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const allStatuses: ChainNodeStatus[] = [];
  for (const docType of DRAFT_DOC_TYPES) {
    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", orgId).eq("type", docType)
      )
      .take(20);
    for (const d of docs) {
      allStatuses.push(docStatusToNodeStatus(d.status));
    }
  }
  return aggregateNodeStatus(allStatuses);
};

const fetchNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  kind: ChainNodeKind
): Promise<ChainNodeStatus> => {
  const docType = DOC_TYPE_BY_NODE[kind];
  if (docType) {
    return await fetchDocNodeStatus(ctx, orgId, docType);
  }
  switch (kind) {
    case "personas":
      return await fetchPersonasNodeStatus(ctx, orgId);
    case "use_cases":
      return await fetchUseCasesNodeStatus(ctx, orgId);
    case "lead_targets":
      return await fetchLeadTargetsNodeStatus(ctx, orgId);
    case "community_posts":
      return await fetchCommunityPostsNodeStatus(ctx, orgId);
    case "drafts":
      return await fetchDraftsNodeStatus(ctx, orgId);
    default:
      return "missing";
  }
};

export const computeChainState = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainState> => {
  const state = {} as ChainState;
  for (const kind of CHAIN_NODE_KINDS) {
    state[kind] = await fetchNodeStatus(ctx, orgId, kind);
  }
  return state;
};

export const isNodeReadyToProduce = (
  state: ChainState,
  kind: ChainNodeKind
): boolean => {
  if (state[kind] !== "missing") {
    return false;
  }
  const deps = DAG_EDGES[kind] ?? [];
  return deps.every((dep) => state[dep] === "published");
};

export const getNextActionableNodes = (state: ChainState): ChainNodeKind[] =>
  CHAIN_NODE_KINDS.filter((kind) => isNodeReadyToProduce(state, kind));

export const getChainState = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: chainStateValidator,
  handler: async (ctx, args) => {
    return await computeChainState(ctx, args.organizationId);
  },
});

export const getOpenTaskCount = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();
    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();
    return todoItems.length + inProgressItems.length;
  },
});

export const isGatedByOpenTasks = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<boolean> => {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  const threshold =
    config?.wakeThresholdOpenTasks ?? DEFAULT_WAKE_THRESHOLD_OPEN_TASKS;

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
  const openCount = todoItems.length + inProgressItems.length;

  return openCount >= threshold;
};

export const CHAIN_NODE_OWNERS: Record<ChainNodeKind, string> = {
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

export { CHAIN_NODE_KINDS, DAG_EDGES, DOC_TYPE_BY_NODE, DRAFT_DOC_TYPES };
