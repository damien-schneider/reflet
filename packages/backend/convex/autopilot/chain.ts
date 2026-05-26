/**
 * Chain orchestration — DAG of canonical artifacts.
 *
 * Each node owns a single document type or table. Downstream nodes can only
 * be produced when their upstream dependencies are `published`. The chain is
 * the single source of truth for "what should happen next" in the autopilot.
 *
 * No time-based triggers: every node advancement is condition-based and gated
 * by upstream state.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { chainNodeKind, chainNodeStatus } from "./schema/validators";

const chainStateValidator = v.object({
  codebase_understanding: chainNodeStatus,
  product_profile: chainNodeStatus,
  brand_voice: chainNodeStatus,
  feature_catalog: chainNodeStatus,
  scope: chainNodeStatus,
  market_analysis: chainNodeStatus,
  target_definition: chainNodeStatus,
  personas: chainNodeStatus,
  use_cases: chainNodeStatus,
  lead_targets: chainNodeStatus,
  community_posts: chainNodeStatus,
  drafts: chainNodeStatus,
});

export type ChainNodeKind =
  | "codebase_understanding"
  | "product_profile"
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

export type ChainNodeStatus =
  | "missing"
  | "draft"
  | "pending_review"
  | "published";

export type ChainState = Record<ChainNodeKind, ChainNodeStatus>;

const CHAIN_NODE_KINDS: ChainNodeKind[] = [
  "codebase_understanding",
  "product_profile",
  "brand_voice",
  "feature_catalog",
  "scope",
  "market_analysis",
  "target_definition",
  "personas",
  "use_cases",
  "lead_targets",
  "community_posts",
  "drafts",
];

// Market analysis now grounds on the typed product profile + the three
// markdown knowledge docs directly. The synthesis layer (the old
// `app_description` node + `product_definition` doc) has been removed —
// downstream chain producers read typed inputs.
const DAG_EDGES: Partial<Record<ChainNodeKind, ChainNodeKind[]>> = {
  codebase_understanding: [],
  product_profile: ["codebase_understanding"],
  brand_voice: ["codebase_understanding"],
  feature_catalog: ["codebase_understanding"],
  scope: ["codebase_understanding"],
  market_analysis: [
    "product_profile",
    "brand_voice",
    "feature_catalog",
    "scope",
  ],
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
  market_analysis: "market_research",
  target_definition: "target_definition",
};

/**
 * Chain nodes whose canonical artifact lives in `autopilotKnowledgeDocs`
 * (single source of truth for user-facing structured knowledge). Their status
 * is "published" when the doc exists, "missing" otherwise — knowledge docs
 * have no draft/review workflow.
 */
const KNOWLEDGE_DOC_TYPE_BY_NODE: Partial<
  Record<
    ChainNodeKind,
    "target_audience" | "brand_voice" | "feature_catalog" | "scope"
  >
> = {
  brand_voice: "brand_voice",
  feature_catalog: "feature_catalog",
  scope: "scope",
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

const isChainProducerDoc = (doc: Doc<"autopilotDocuments">): boolean =>
  doc.reviewType === "chain_artifact" && (doc.tags?.includes("chain") ?? false);

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
  const chainDocs = docs.filter(isChainProducerDoc);
  return aggregateNodeStatus(
    chainDocs.map((d) => docStatusToNodeStatus(d.status))
  );
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

const fetchKnowledgeDocNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  docType: NonNullable<(typeof KNOWLEDGE_DOC_TYPE_BY_NODE)[ChainNodeKind]>
): Promise<ChainNodeStatus> => {
  const doc = await ctx.db
    .query("autopilotKnowledgeDocs")
    .withIndex("by_org_docType", (q) =>
      q.eq("organizationId", orgId).eq("docType", docType)
    )
    .unique();
  return doc ? "published" : "missing";
};

const fetchProductProfileNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<ChainNodeStatus> => {
  const profile = await ctx.db
    .query("autopilotProductProfile")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  return profile ? "published" : "missing";
};

const fetchNodeStatus = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  kind: ChainNodeKind
): Promise<ChainNodeStatus> => {
  const knowledgeType = KNOWLEDGE_DOC_TYPE_BY_NODE[kind];
  if (knowledgeType) {
    return await fetchKnowledgeDocNodeStatus(ctx, orgId, knowledgeType);
  }
  const docType = DOC_TYPE_BY_NODE[kind];
  if (docType) {
    return await fetchDocNodeStatus(ctx, orgId, docType);
  }
  switch (kind) {
    case "product_profile":
      return await fetchProductProfileNodeStatus(ctx, orgId);
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

export const getRoleChainGate = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
  },
  returns: v.object({
    ready: v.boolean(),
    missing: v.array(chainNodeKind),
  }),
  handler: async (ctx, args) => {
    const state = await computeChainState(ctx, args.organizationId);
    return {
      ready: isRoleChainReady(state, args.role),
      missing: getRoleMissingDependencies(state, args.role),
    };
  },
});

export const CHAIN_NODE_OWNERS: Record<ChainNodeKind, string> = {
  codebase_understanding: "cto",
  product_profile: "cto",
  brand_voice: "cto",
  feature_catalog: "cto",
  scope: "cto",
  market_analysis: "growth",
  target_definition: "pm",
  personas: "pm",
  use_cases: "pm",
  lead_targets: "sales",
  community_posts: "growth",
  drafts: "growth",
};

export const CHAIN_NODE_LABELS: Record<ChainNodeKind, string> = {
  codebase_understanding: "Codebase understanding",
  product_profile: "Product profile",
  brand_voice: "Brand voice",
  feature_catalog: "Feature catalog",
  scope: "Scope",
  market_analysis: "Market analysis",
  target_definition: "Target definition",
  personas: "Personas",
  use_cases: "Use cases",
  lead_targets: "Lead targets",
  community_posts: "Community posts",
  drafts: "Drafts",
};

export const CHAIN_NODE_PLURALS: Record<ChainNodeKind, string> = {
  codebase_understanding: "docs",
  product_profile: "profile",
  brand_voice: "docs",
  feature_catalog: "docs",
  scope: "docs",
  market_analysis: "docs",
  target_definition: "docs",
  personas: "personas",
  use_cases: "use cases",
  lead_targets: "leads",
  community_posts: "posts",
  drafts: "drafts",
};

export const CHAIN_STAGES: readonly {
  id: string;
  label: string;
  nodes: readonly ChainNodeKind[];
}[] = [
  {
    id: "foundation",
    label: "Foundation",
    nodes: ["codebase_understanding"],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    nodes: ["product_profile", "brand_voice", "feature_catalog", "scope"],
  },
  {
    id: "market",
    label: "Market",
    nodes: ["market_analysis", "target_definition"],
  },
  { id: "audience", label: "Audience", nodes: ["personas", "use_cases"] },
  {
    id: "outreach",
    label: "Outreach",
    nodes: ["lead_targets", "community_posts"],
  },
  { id: "distribution", label: "Distribution", nodes: ["drafts"] },
];

/**
 * Per-role chain readiness. Defines which chain nodes MUST be `published`
 * before a role skill is allowed to run free-form work (i.e. work outside the
 * chain producers themselves). Chain producers handle their own gating via
 * `isNodeReadyToProduce`.
 *
 * - `cto`: spec generation needs the product identity published as grounding.
 * - `pm`: free analysis (roadmap from feedback) needs to know users → personas.
 * - `growth`: free content/market work needs market_analysis published.
 * - `sales`: lead generation needs personas (lead_targets depends on personas).
 * - `support`, `ceo`, `validator`: independent of chain state.
 */
export const ROLE_CHAIN_REQUIREMENTS: Record<string, ChainNodeKind[]> = {
  cto: ["product_profile"],
  pm: ["personas"],
  growth: ["market_analysis"],
  sales: ["personas"],
  support: [],
  ceo: [],
  validator: [],
};

export const isRoleChainReady = (state: ChainState, role: string): boolean => {
  const required = ROLE_CHAIN_REQUIREMENTS[role] ?? [];
  return required.every((node) => state[node] === "published");
};

export const getRoleMissingDependencies = (
  state: ChainState,
  role: string
): ChainNodeKind[] => {
  const required = ROLE_CHAIN_REQUIREMENTS[role] ?? [];
  return required.filter((node) => state[node] !== "published");
};

export const DRAFT_DOC_LABELS: Record<
  (typeof DRAFT_DOC_TYPES)[number],
  string
> = {
  blog_post: "Blog post",
  reddit_reply: "Reddit reply",
  linkedin_post: "LinkedIn post",
  twitter_post: "Tweet",
  hn_comment: "HN comment",
  email: "Email",
  changelog: "Changelog",
};

// ============================================
// NODE PRECONDITIONS — runtime gates beyond DAG deps
// ============================================
//
// Some nodes can only be produced when an external prerequisite has been
// satisfied (e.g. `codebase_understanding` needs a completed repo analysis).
// Declaring these here keeps the chain page UI, the role schedule, and the
// producer dispatch in sync: each consumer asks `checkNodePrecondition` for
// the same answer instead of re-implementing the rule.

export type NodePreconditionResult =
  | { met: true }
  | { met: false; reason: string };

type PreconditionFn = (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
) => Promise<NodePreconditionResult>;

const fetchRepoAnalysisReady = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<boolean> => {
  const integration = await ctx.db
    .query("repoAnalysis")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .order("desc")
    .first();
  return (
    integration?.status === "completed" && Boolean(integration.productAnalysis)
  );
};

const NODE_PRECONDITIONS: Partial<Record<ChainNodeKind, PreconditionFn>> = {
  codebase_understanding: async (ctx, orgId) => {
    // SSOT: integration's repoAnalysis is the only source. Producer consumes
    // `productAnalysis` text directly. Precondition mirrors that contract.
    const integration = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .first();
    if (!integration) {
      return {
        met: false,
        reason: "No repo analysis yet — run one in Knowledge",
      };
    }
    if (
      integration.status === "pending" ||
      integration.status === "in_progress"
    ) {
      return { met: false, reason: "Repo analysis still running" };
    }
    if (integration.status === "error") {
      return {
        met: false,
        reason: `Last repo analysis failed${integration.error ? `: ${integration.error}` : ""}`,
      };
    }
    if (!integration.productAnalysis) {
      return {
        met: false,
        reason:
          "Repo analysis completed but productAnalysis text is empty — recompute it",
      };
    }
    return { met: true };
  },
};

export const checkNodePrecondition = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  kind: ChainNodeKind
): Promise<NodePreconditionResult> => {
  const check = NODE_PRECONDITIONS[kind];
  if (!check) {
    return { met: true };
  }
  return await check(ctx, orgId);
};

export {
  CHAIN_NODE_KINDS,
  DAG_EDGES,
  DOC_TYPE_BY_NODE,
  DRAFT_DOC_TYPES,
  fetchRepoAnalysisReady,
  KNOWLEDGE_DOC_TYPE_BY_NODE,
};
