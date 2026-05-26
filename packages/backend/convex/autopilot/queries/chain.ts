/**
 * Public-facing chain queries — admin UI consumes these to render DAG status.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  CHAIN_NODE_KINDS,
  CHAIN_NODE_LABELS,
  CHAIN_NODE_OWNERS,
  CHAIN_NODE_PLURALS,
  CHAIN_STAGES,
  type ChainNodeKind,
  checkNodePrecondition,
  computeChainState,
  DAG_EDGES,
  DOC_TYPE_BY_NODE,
  DRAFT_DOC_TYPES,
  getNextActionableNodes,
  KNOWLEDGE_DOC_TYPE_BY_NODE,
  ROLE_CHAIN_REQUIREMENTS,
} from "../chain";
import { resolveDeliverableFreshness } from "../runtime/policy";
import {
  activityLogLevel,
  chainNodeKind,
  chainNodeStatus,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

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

export const getChainStatePublic = query({
  args: { organizationId: v.id("organizations") },
  returns: chainStateValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return await computeChainState(ctx, args.organizationId);
  },
});

interface DraftSubtype {
  avgValidationScore: number | null;
  count: number;
  kind: (typeof DRAFT_DOC_TYPES)[number];
  lastUpdatedAt: number | null;
  status: "missing" | "draft" | "pending_review" | "published";
}

interface NodeMeta {
  avgValidationScore: number | null;
  count: number;
  draftSubtypes?: DraftSubtype[];
  lastUpdatedAt: number | null;
  recentTitles: string[];
}

const RECENT_TITLE_LIMIT = 3;
const TITLE_MAX_LENGTH = 80;

const truncateTitle = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
};

const pickRecentTitles = <T>(
  items: T[],
  getUpdatedAt: (item: T) => number,
  getTitle: (item: T) => string | null | undefined
): string[] =>
  [...items]
    .sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a))
    .slice(0, RECENT_TITLE_LIMIT)
    .map((it) => getTitle(it) ?? "")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map(truncateTitle);

const draftDocStatusToSubtypeStatus = (
  status: Doc<"autopilotDocuments">["status"]
): DraftSubtype["status"] => {
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

const aggregateDraftSubtypeStatus = (
  docs: Doc<"autopilotDocuments">[]
): DraftSubtype["status"] => {
  if (docs.length === 0) {
    return "missing";
  }
  const statuses = docs.map((d) => draftDocStatusToSubtypeStatus(d.status));
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

const averageRounded = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
};

const maxOrNull = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  let m = values[0] ?? 0;
  for (const v of values) {
    if (v > m) {
      m = v;
    }
  }
  return m;
};

const fetchDocsByType = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  docType: Doc<"autopilotDocuments">["type"]
): Promise<Doc<"autopilotDocuments">[]> =>
  await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", orgId).eq("type", docType)
    )
    .collect();

const aggregateDocs = (docs: Doc<"autopilotDocuments">[]): NodeMeta => {
  const updatedAts = docs.map((d) => d.updatedAt);
  const scores = docs
    .map((d) => d.validation?.composite)
    .filter((v): v is number => typeof v === "number");
  return {
    count: docs.length,
    lastUpdatedAt: maxOrNull(updatedAts),
    avgValidationScore: averageRounded(scores),
    recentTitles: pickRecentTitles(
      docs,
      (d) => d.updatedAt,
      (d) => d.title
    ),
  };
};

const buildDraftSubtypes = (
  docsByType: Map<(typeof DRAFT_DOC_TYPES)[number], Doc<"autopilotDocuments">[]>
): DraftSubtype[] =>
  DRAFT_DOC_TYPES.map((kind) => {
    const docs = docsByType.get(kind) ?? [];
    const scores = docs
      .map((d) => d.validation?.composite)
      .filter((v): v is number => typeof v === "number");
    return {
      kind,
      count: docs.length,
      status: aggregateDraftSubtypeStatus(docs),
      lastUpdatedAt: maxOrNull(docs.map((d) => d.updatedAt)),
      avgValidationScore: averageRounded(scores),
    };
  });

const fetchDraftsMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const docsByType = new Map<
    (typeof DRAFT_DOC_TYPES)[number],
    Doc<"autopilotDocuments">[]
  >();
  const allDocs: Doc<"autopilotDocuments">[] = [];
  for (const docType of DRAFT_DOC_TYPES) {
    const docs = await fetchDocsByType(ctx, orgId, docType);
    docsByType.set(docType, docs);
    allDocs.push(...docs);
  }
  const base = aggregateDocs(allDocs);
  return { ...base, draftSubtypes: buildDraftSubtypes(docsByType) };
};

const fetchPersonasMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const personas = await ctx.db
    .query("autopilotPersonas")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  return {
    count: personas.length,
    lastUpdatedAt: maxOrNull(personas.map((p) => p.updatedAt)),
    avgValidationScore: null,
    recentTitles: pickRecentTitles(
      personas,
      (p) => p.updatedAt,
      (p) => p.name
    ),
  };
};

const fetchUseCasesMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const items = await ctx.db
    .query("autopilotUseCases")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  const scores = items
    .map((u) => u.validation?.composite)
    .filter((v): v is number => typeof v === "number");
  return {
    count: items.length,
    lastUpdatedAt: maxOrNull(items.map((u) => u.updatedAt)),
    avgValidationScore: averageRounded(scores),
    recentTitles: pickRecentTitles(
      items,
      (u) => u.updatedAt,
      (u) => u.title
    ),
  };
};

const fetchLeadsMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const leads = await ctx.db
    .query("autopilotLeads")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  return {
    count: leads.length,
    lastUpdatedAt: maxOrNull(leads.map((l) => l.updatedAt)),
    avgValidationScore: null,
    recentTitles: pickRecentTitles(
      leads,
      (l) => l.updatedAt,
      (l) => l.name
    ),
  };
};

const fetchCommunityPostsMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const items = await ctx.db
    .query("autopilotCommunityPosts")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  const scores = items
    .map((p) => p.validation?.composite)
    .filter((v): v is number => typeof v === "number");
  return {
    count: items.length,
    lastUpdatedAt: maxOrNull(items.map((p) => p.updatedAt)),
    avgValidationScore: averageRounded(scores),
    recentTitles: pickRecentTitles(
      items,
      (p) => p.updatedAt,
      (p) => p.title ?? p.authorName
    ),
  };
};

const fetchKnowledgeDocNodeMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  docType: NonNullable<(typeof KNOWLEDGE_DOC_TYPE_BY_NODE)[ChainNodeKind]>
): Promise<NodeMeta> => {
  const doc = await ctx.db
    .query("autopilotKnowledgeDocs")
    .withIndex("by_org_docType", (q) =>
      q.eq("organizationId", orgId).eq("docType", docType)
    )
    .unique();
  if (!doc) {
    return {
      count: 0,
      lastUpdatedAt: null,
      avgValidationScore: null,
      recentTitles: [],
    };
  }
  return {
    count: 1,
    lastUpdatedAt: doc.lastUpdatedAt,
    avgValidationScore: null,
    recentTitles: [doc.title],
  };
};

const fetchProductProfileMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const profile = await ctx.db
    .query("autopilotProductProfile")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  if (!profile) {
    return {
      count: 0,
      lastUpdatedAt: null,
      avgValidationScore: null,
      recentTitles: [],
    };
  }
  return {
    count: 1,
    lastUpdatedAt: profile.lastUpdatedAt,
    avgValidationScore: null,
    recentTitles: [profile.productName],
  };
};

const fetchNodeMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  kind: ChainNodeKind
): Promise<NodeMeta> => {
  if (kind === "drafts") {
    return await fetchDraftsMeta(ctx, orgId);
  }
  if (kind === "product_profile") {
    return await fetchProductProfileMeta(ctx, orgId);
  }
  const knowledgeType = KNOWLEDGE_DOC_TYPE_BY_NODE[kind];
  if (knowledgeType) {
    return await fetchKnowledgeDocNodeMeta(ctx, orgId, knowledgeType);
  }
  const docType = DOC_TYPE_BY_NODE[kind];
  if (docType) {
    const docs = await fetchDocsByType(ctx, orgId, docType);
    const chainDocs = docs.filter(
      (d) =>
        d.status !== "archived" &&
        d.reviewType === "chain_artifact" &&
        (d.tags?.includes("chain") ?? false)
    );
    return aggregateDocs(chainDocs);
  }
  switch (kind) {
    case "personas":
      return await fetchPersonasMeta(ctx, orgId);
    case "use_cases":
      return await fetchUseCasesMeta(ctx, orgId);
    case "lead_targets":
      return await fetchLeadsMeta(ctx, orgId);
    case "community_posts":
      return await fetchCommunityPostsMeta(ctx, orgId);
    default:
      return {
        count: 0,
        lastUpdatedAt: null,
        avgValidationScore: null,
        recentTitles: [],
      };
  }
};

const draftSubtypeKindValidator = v.union(
  v.literal("blog_post"),
  v.literal("reddit_reply"),
  v.literal("linkedin_post"),
  v.literal("twitter_post"),
  v.literal("hn_comment"),
  v.literal("email"),
  v.literal("changelog")
);

const draftSubtypeStatusValidator = v.union(
  v.literal("missing"),
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published")
);

const draftSubtypeValidator = v.object({
  kind: draftSubtypeKindValidator,
  count: v.number(),
  status: draftSubtypeStatusValidator,
  lastUpdatedAt: v.union(v.number(), v.null()),
  avgValidationScore: v.union(v.number(), v.null()),
});

const freshnessValidator = v.object({
  kind: v.union(v.literal("current"), v.literal("stale")),
  reason: v.union(
    v.literal("commit_threshold"),
    v.literal("age_with_new_commit"),
    v.null()
  ),
  summary: v.string(),
});

type DeliverableFreshness = ReturnType<typeof resolveDeliverableFreshness>;

const isRoleDisabledForOwner = (
  owner: string,
  config: Doc<"autopilotConfig"> | null
): boolean => {
  if (!config) {
    return false;
  }
  if (owner === "cto") {
    return config.ctoEnabled === false;
  }
  if (owner === "pm") {
    return config.pmEnabled === false;
  }
  if (owner === "growth") {
    return config.growthEnabled === false;
  }
  if (owner === "sales") {
    return config.salesEnabled === false;
  }
  return false;
};

export const getChainOverview = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    nodes: v.array(
      v.object({
        kind: chainNodeKind,
        status: chainNodeStatus,
        actionable: v.boolean(),
        owner: v.string(),
        roleDisabled: v.boolean(),
        artifactCount: v.number(),
        lastUpdatedAt: v.union(v.number(), v.null()),
        avgValidationScore: v.union(v.number(), v.null()),
        recentTitles: v.array(v.string()),
        freshness: freshnessValidator,
        draftSubtypes: v.optional(v.array(draftSubtypeValidator)),
        preconditionUnmet: v.optional(v.object({ reason: v.string() })),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const chainState = await computeChainState(ctx, args.organizationId);
    const actionableSet = new Set(getNextActionableNodes(chainState));
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
    const now = Date.now();

    const nodes: Array<{
      actionable: boolean;
      artifactCount: number;
      avgValidationScore: number | null;
      draftSubtypes?: DraftSubtype[];
      freshness: DeliverableFreshness;
      kind: ChainNodeKind;
      lastUpdatedAt: number | null;
      owner: string;
      preconditionUnmet?: { reason: string };
      recentTitles: string[];
      roleDisabled: boolean;
      status: (typeof chainState)[ChainNodeKind];
    }> = [];
    for (const kind of CHAIN_NODE_KINDS) {
      const meta = await fetchNodeMeta(ctx, args.organizationId, kind);
      const precondition = await checkNodePrecondition(
        ctx,
        args.organizationId,
        kind
      );
      const durableState = await ctx.db
        .query("autopilotDeliverableStates")
        .withIndex("by_org_node", (q) =>
          q.eq("organizationId", args.organizationId).eq("node", kind)
        )
        .unique();
      const currentCommitCount = durableState?.currentCommitCount ?? 0;
      const sourceCommitCount =
        durableState?.sourceCommitCount ?? currentCommitCount;
      const owner = CHAIN_NODE_OWNERS[kind];
      nodes.push({
        kind,
        status: chainState[kind],
        actionable: actionableSet.has(kind),
        owner,
        roleDisabled: isRoleDisabledForOwner(owner, config),
        artifactCount: meta.count,
        lastUpdatedAt: meta.lastUpdatedAt,
        avgValidationScore: meta.avgValidationScore,
        recentTitles: meta.recentTitles,
        freshness: resolveDeliverableFreshness({
          commitsSinceSource: Math.max(
            0,
            currentCommitCount - sourceCommitCount
          ),
          generatedAt: meta.lastUpdatedAt,
          now,
        }),
        ...(meta.draftSubtypes ? { draftSubtypes: meta.draftSubtypes } : {}),
        ...(precondition.met
          ? {}
          : { preconditionUnmet: { reason: precondition.reason } }),
      });
    }

    return { nodes };
  },
});

export const listPersonas = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotPersonas")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const listUseCases = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotUseCases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const listCommunityPosts = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotCommunityPosts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

const chainNodeItemValidator = v.object({
  title: v.string(),
  summary: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

interface ProductProfileDetail {
  category: string | null;
  differentiators: string[];
  oneLiner: string;
  pricingModel:
    | "free"
    | "freemium"
    | "paid"
    | "open_source"
    | "enterprise"
    | "unknown"
    | null;
  primaryUserVerbs: string[];
  productName: string;
  tagline: string;
  targetAudienceTags: string[];
  valueProposition: string;
  websiteUrl: string | null;
}

const fetchProductProfileDetail = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<{
  detail: ProductProfileDetail | null;
  lastUpdatedAt: number | null;
}> => {
  const profile = await ctx.db
    .query("autopilotProductProfile")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  if (!profile) {
    return { detail: null, lastUpdatedAt: null };
  }
  return {
    detail: {
      productName: profile.productName,
      tagline: profile.tagline,
      oneLiner: profile.oneLiner,
      category: profile.category ?? null,
      websiteUrl: profile.websiteUrl ?? null,
      valueProposition: profile.valueProposition,
      differentiators: profile.differentiators,
      primaryUserVerbs: profile.primaryUserVerbs,
      targetAudienceTags: profile.targetAudienceTags,
      pricingModel: profile.pricingModel ?? null,
    },
    lastUpdatedAt: profile.lastUpdatedAt,
  };
};

const productProfileDetailValidator = v.object({
  productName: v.string(),
  tagline: v.string(),
  oneLiner: v.string(),
  category: v.union(v.string(), v.null()),
  websiteUrl: v.union(v.string(), v.null()),
  valueProposition: v.string(),
  differentiators: v.array(v.string()),
  primaryUserVerbs: v.array(v.string()),
  targetAudienceTags: v.array(v.string()),
  pricingModel: v.union(
    v.literal("free"),
    v.literal("freemium"),
    v.literal("paid"),
    v.literal("open_source"),
    v.literal("enterprise"),
    v.literal("unknown"),
    v.null()
  ),
});

/**
 * Returns the content needed to preview a chain node in the UI:
 * - markdown (when the node maps to a single canonical document)
 * - items (when the node represents a collection: personas, use cases, etc.)
 *
 * Used by the chain tree's preview dialog. Reads the canonical store for each
 * kind — knowledge docs for `app_description`, documents table for other doc
 * nodes, and the dedicated table for collections.
 */
const pendingDocumentValidator = v.object({
  documentId: v.id("autopilotDocuments"),
  status: chainNodeStatus,
  needsReview: v.boolean(),
});

export const getChainNodeDetail = query({
  args: {
    organizationId: v.id("organizations"),
    kind: chainNodeKind,
  },
  returns: v.object({
    kind: chainNodeKind,
    markdown: v.union(v.string(), v.null()),
    productProfile: v.union(productProfileDetailValidator, v.null()),
    items: v.array(chainNodeItemValidator),
    lastUpdatedAt: v.union(v.number(), v.null()),
    pendingDocument: v.union(pendingDocumentValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    if (args.kind === "product_profile") {
      const { detail, lastUpdatedAt } = await fetchProductProfileDetail(
        ctx,
        args.organizationId
      );
      return {
        kind: args.kind,
        markdown: null,
        productProfile: detail,
        items: [],
        lastUpdatedAt,
        pendingDocument: null,
      };
    }

    const knowledgeType = KNOWLEDGE_DOC_TYPE_BY_NODE[args.kind];
    if (knowledgeType) {
      const doc = await ctx.db
        .query("autopilotKnowledgeDocs")
        .withIndex("by_org_docType", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("docType", knowledgeType)
        )
        .unique();
      return {
        kind: args.kind,
        markdown: doc?.contentFull ?? null,
        productProfile: null,
        items: [],
        lastUpdatedAt: doc?.lastUpdatedAt ?? null,
        pendingDocument: null,
      };
    }

    const docType = DOC_TYPE_BY_NODE[args.kind];
    if (docType) {
      const docs = await ctx.db
        .query("autopilotDocuments")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", docType)
        )
        .order("desc")
        .take(50);
      const doc = docs.find(
        (d) =>
          d.status !== "archived" &&
          d.reviewType === "chain_artifact" &&
          (d.tags?.includes("chain") ?? false)
      );
      const pendingDocument =
        doc && doc.status === "pending_review" && doc.needsReview === true
          ? {
              documentId: doc._id,
              status: doc.status,
              needsReview: doc.needsReview,
            }
          : null;
      return {
        kind: args.kind,
        markdown: doc?.content ?? null,
        productProfile: null,
        items: [],
        lastUpdatedAt: doc?.updatedAt ?? null,
        pendingDocument,
      };
    }

    if (args.kind === "personas") {
      const personas = await ctx.db
        .query("autopilotPersonas")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      return {
        kind: args.kind,
        markdown: null,
        productProfile: null,
        items: personas.map((p) => ({
          title: p.name,
          summary: p.description,
          updatedAt: p.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(personas.map((p) => p.updatedAt)),
        pendingDocument: null,
      };
    }

    if (args.kind === "use_cases") {
      const items = await ctx.db
        .query("autopilotUseCases")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      return {
        kind: args.kind,
        markdown: null,
        productProfile: null,
        items: items.map((u) => ({
          title: u.title,
          summary: u.description,
          updatedAt: u.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(items.map((u) => u.updatedAt)),
        pendingDocument: null,
      };
    }

    if (args.kind === "lead_targets") {
      const leads = await ctx.db
        .query("autopilotLeads")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .take(50);
      return {
        kind: args.kind,
        markdown: null,
        productProfile: null,
        items: leads.map((l) => ({
          title: l.name,
          summary: l.company ?? l.bio ?? null,
          updatedAt: l.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(leads.map((l) => l.updatedAt)),
        pendingDocument: null,
      };
    }

    if (args.kind === "community_posts") {
      const posts = await ctx.db
        .query("autopilotCommunityPosts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .take(50);
      return {
        kind: args.kind,
        markdown: null,
        productProfile: null,
        items: posts.map((p) => ({
          title: p.title ?? p.authorName,
          summary: p.content.slice(0, 200),
          updatedAt: p.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(posts.map((p) => p.updatedAt)),
        pendingDocument: null,
      };
    }

    if (args.kind === "drafts") {
      const items: Array<{
        title: string;
        summary: string | null;
        updatedAt: number;
      }> = [];
      for (const draftType of DRAFT_DOC_TYPES) {
        const docs = await ctx.db
          .query("autopilotDocuments")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", args.organizationId).eq("type", draftType)
          )
          .order("desc")
          .take(5);
        for (const d of docs) {
          items.push({
            title: d.title,
            summary: d.content.slice(0, 200),
            updatedAt: d.updatedAt,
          });
        }
      }
      return {
        kind: args.kind,
        markdown: null,
        productProfile: null,
        items: items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30),
        lastUpdatedAt: maxOrNull(items.map((i) => i.updatedAt)),
        pendingDocument: null,
      };
    }

    return {
      kind: args.kind,
      markdown: null,
      productProfile: null,
      items: [],
      lastUpdatedAt: null,
      pendingDocument: null,
    };
  },
});

/**
 * Canonical DAG metadata for UI consumption. Single source of truth — the UI
 * MUST NOT redefine labels, owners, edges, or stages locally; consume this query.
 */
export const getChainMeta = query({
  args: {},
  returns: v.object({
    nodes: v.array(
      v.object({
        kind: chainNodeKind,
        label: v.string(),
        owner: v.string(),
        plural: v.string(),
        deps: v.array(chainNodeKind),
      })
    ),
    edges: v.array(v.object({ from: chainNodeKind, to: chainNodeKind })),
    stages: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        nodes: v.array(chainNodeKind),
      })
    ),
    roleRequirements: v.record(v.string(), v.array(chainNodeKind)),
  }),
  handler: () => {
    const nodes = CHAIN_NODE_KINDS.map((kind) => ({
      kind,
      label: CHAIN_NODE_LABELS[kind],
      owner: CHAIN_NODE_OWNERS[kind],
      plural: CHAIN_NODE_PLURALS[kind],
      deps: DAG_EDGES[kind] ?? [],
    }));
    const edges: Array<{ from: ChainNodeKind; to: ChainNodeKind }> = [];
    for (const kind of CHAIN_NODE_KINDS) {
      for (const dep of DAG_EDGES[kind] ?? []) {
        edges.push({ from: dep, to: kind });
      }
    }
    const stages = CHAIN_STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
      nodes: [...stage.nodes],
    }));
    return {
      nodes,
      edges,
      stages,
      roleRequirements: ROLE_CHAIN_REQUIREMENTS,
    };
  },
});

/**
 * Current chain work — what the autopilot is producing right now.
 *
 * "Producing" = a chain producer was scheduled but no terminal log (success/error)
 * has landed yet within the heartbeat window. Used by the floating status bar
 * to surface live activity, derived from `autopilotActivityLog`.
 */
const CHAIN_WORK_LOOKBACK_MS = 15 * 60 * 1000;
const PRODUCER_MESSAGE_TO_NODE: Array<{
  needle: string;
  kind: ChainNodeKind;
}> = [
  { needle: "codebase_understanding", kind: "codebase_understanding" },
  { needle: "product_profile", kind: "product_profile" },
  { needle: "brand_voice", kind: "brand_voice" },
  { needle: "feature_catalog", kind: "feature_catalog" },
  { needle: "scope", kind: "scope" },
  { needle: "market_analysis", kind: "market_analysis" },
  { needle: "target_definition", kind: "target_definition" },
  { needle: "personas", kind: "personas" },
  { needle: "use_cases", kind: "use_cases" },
  { needle: "community_posts", kind: "community_posts" },
  { needle: "drafts", kind: "drafts" },
];

const inferChainNodeFromMessage = (message: string): ChainNodeKind | null => {
  const lower = message.toLowerCase();
  for (const { needle, kind } of PRODUCER_MESSAGE_TO_NODE) {
    if (lower.includes(needle)) {
      return kind;
    }
  }
  return null;
};

const resolveActivityRole = (log: { role: string }): string => log.role;

export const getActiveChainWork = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    activeNode: v.union(chainNodeKind, v.null()),
    message: v.union(v.string(), v.null()),
    role: v.union(v.string(), v.null()),
    startedAt: v.union(v.number(), v.null()),
    recent: v.array(
      v.object({
        message: v.string(),
        level: activityLogLevel,
        createdAt: v.number(),
        role: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const cutoff = Date.now() - CHAIN_WORK_LOOKBACK_MS;
    const logs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gt("createdAt", cutoff)
      )
      .order("desc")
      .take(40);

    const recent = logs.slice(0, 6).map((log) => ({
      message: log.message,
      level: log.level,
      createdAt: log.createdAt,
      role: resolveActivityRole(log),
    }));

    const lastAction = logs.find(
      (log) =>
        log.level === "action" &&
        inferChainNodeFromMessage(log.message) !== null
    );

    if (!lastAction) {
      return {
        activeNode: null,
        message: null,
        role: null,
        startedAt: null,
        recent,
      };
    }

    const terminal = logs.find(
      (log) =>
        resolveActivityRole(log) === resolveActivityRole(lastAction) &&
        log.createdAt > lastAction.createdAt &&
        (log.level === "success" || log.level === "error")
    );

    if (terminal) {
      return {
        activeNode: null,
        message: null,
        role: null,
        startedAt: null,
        recent,
      };
    }

    return {
      activeNode: inferChainNodeFromMessage(lastAction.message),
      message: lastAction.message,
      role: resolveActivityRole(lastAction),
      startedAt: lastAction.createdAt,
      recent,
    };
  },
});
