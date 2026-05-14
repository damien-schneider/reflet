/**
 * Public-facing chain queries — admin UI consumes these to render DAG status.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  AGENT_CHAIN_REQUIREMENTS,
  CHAIN_NODE_KINDS,
  CHAIN_NODE_LABELS,
  CHAIN_NODE_OWNERS,
  CHAIN_NODE_PLURALS,
  CHAIN_STAGES,
  type ChainNodeKind,
  computeChainState,
  DAG_EDGES,
  DOC_TYPE_BY_NODE,
  DRAFT_DOC_TYPES,
  getNextActionableNodes,
  KNOWLEDGE_DOC_TYPE_BY_NODE,
} from "../chain";
import {
  activityLogLevel,
  chainNodeKind,
  chainNodeStatus,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

const DEFAULT_WAKE_THRESHOLD = 5;

const chainStateValidator = v.object({
  codebase_understanding: chainNodeStatus,
  identity: chainNodeStatus,
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

const fetchNodeMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">,
  kind: ChainNodeKind
): Promise<NodeMeta> => {
  if (kind === "drafts") {
    return await fetchDraftsMeta(ctx, orgId);
  }
  const knowledgeType = KNOWLEDGE_DOC_TYPE_BY_NODE[kind];
  if (knowledgeType) {
    return await fetchKnowledgeDocNodeMeta(ctx, orgId, knowledgeType);
  }
  const docType = DOC_TYPE_BY_NODE[kind];
  if (docType) {
    const docs = await fetchDocsByType(ctx, orgId, docType);
    return aggregateDocs(docs);
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

export const getChainOverview = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    nodes: v.array(
      v.object({
        kind: chainNodeKind,
        status: chainNodeStatus,
        actionable: v.boolean(),
        owner: v.string(),
        artifactCount: v.number(),
        lastUpdatedAt: v.union(v.number(), v.null()),
        avgValidationScore: v.union(v.number(), v.null()),
        recentTitles: v.array(v.string()),
        draftSubtypes: v.optional(v.array(draftSubtypeValidator)),
      })
    ),
    gatedByOpenTasks: v.boolean(),
    openTaskCount: v.number(),
    wakeThreshold: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const chainState = await computeChainState(ctx, args.organizationId);
    const actionableSet = new Set(getNextActionableNodes(chainState));

    const nodes: Array<{
      actionable: boolean;
      artifactCount: number;
      avgValidationScore: number | null;
      draftSubtypes?: DraftSubtype[];
      kind: ChainNodeKind;
      lastUpdatedAt: number | null;
      owner: string;
      recentTitles: string[];
      status: (typeof chainState)[ChainNodeKind];
    }> = [];
    for (const kind of CHAIN_NODE_KINDS) {
      const meta = await fetchNodeMeta(ctx, args.organizationId, kind);
      nodes.push({
        kind,
        status: chainState[kind],
        actionable: actionableSet.has(kind),
        owner: CHAIN_NODE_OWNERS[kind],
        artifactCount: meta.count,
        lastUpdatedAt: meta.lastUpdatedAt,
        avgValidationScore: meta.avgValidationScore,
        recentTitles: meta.recentTitles,
        ...(meta.draftSubtypes ? { draftSubtypes: meta.draftSubtypes } : {}),
      });
    }

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
    const wakeThreshold =
      config?.wakeThresholdOpenTasks ?? DEFAULT_WAKE_THRESHOLD;
    const openTaskCount = await fetchOpenTaskCount(ctx, args.organizationId);
    const gatedByOpenTasks = openTaskCount >= wakeThreshold;

    return { nodes, gatedByOpenTasks, openTaskCount, wakeThreshold };
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

/**
 * Returns the content needed to preview a chain node in the UI:
 * - markdown (when the node maps to a single canonical document)
 * - items (when the node represents a collection: personas, use cases, etc.)
 *
 * Used by the chain tree's preview dialog. Reads the canonical store for each
 * kind — knowledge docs for `app_description`, documents table for other doc
 * nodes, and the dedicated table for collections.
 */
export const getChainNodeDetail = query({
  args: {
    organizationId: v.id("organizations"),
    kind: chainNodeKind,
  },
  returns: v.object({
    kind: chainNodeKind,
    markdown: v.union(v.string(), v.null()),
    items: v.array(chainNodeItemValidator),
    lastUpdatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

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
        items: [],
        lastUpdatedAt: doc?.lastUpdatedAt ?? null,
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
        .take(1);
      const doc = docs[0];
      return {
        kind: args.kind,
        markdown: doc?.content ?? null,
        items: [],
        lastUpdatedAt: doc?.updatedAt ?? null,
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
        items: personas.map((p) => ({
          title: p.name,
          summary: p.description,
          updatedAt: p.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(personas.map((p) => p.updatedAt)),
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
        items: items.map((u) => ({
          title: u.title,
          summary: u.description,
          updatedAt: u.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(items.map((u) => u.updatedAt)),
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
        items: leads.map((l) => ({
          title: l.name,
          summary: l.company ?? l.bio ?? null,
          updatedAt: l.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(leads.map((l) => l.updatedAt)),
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
        items: posts.map((p) => ({
          title: p.title ?? p.authorName,
          summary: p.content.slice(0, 200),
          updatedAt: p.updatedAt,
        })),
        lastUpdatedAt: maxOrNull(posts.map((p) => p.updatedAt)),
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
        items: items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30),
        lastUpdatedAt: maxOrNull(items.map((i) => i.updatedAt)),
      };
    }

    return { kind: args.kind, markdown: null, items: [], lastUpdatedAt: null };
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
    agentRequirements: v.record(v.string(), v.array(chainNodeKind)),
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
      agentRequirements: AGENT_CHAIN_REQUIREMENTS,
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
  { needle: "identity", kind: "identity" },
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

export const getActiveChainWork = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    activeNode: v.union(chainNodeKind, v.null()),
    agent: v.union(v.string(), v.null()),
    message: v.union(v.string(), v.null()),
    startedAt: v.union(v.number(), v.null()),
    recent: v.array(
      v.object({
        agent: v.string(),
        message: v.string(),
        level: activityLogLevel,
        createdAt: v.number(),
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
      agent: log.agent,
      message: log.message,
      level: log.level,
      createdAt: log.createdAt,
    }));

    const lastAction = logs.find(
      (log) =>
        log.level === "action" &&
        inferChainNodeFromMessage(log.message) !== null
    );

    if (!lastAction) {
      return {
        activeNode: null,
        agent: null,
        message: null,
        startedAt: null,
        recent,
      };
    }

    const terminal = logs.find(
      (log) =>
        log.agent === lastAction.agent &&
        log.createdAt > lastAction.createdAt &&
        (log.level === "success" || log.level === "error")
    );

    if (terminal) {
      return {
        activeNode: null,
        agent: null,
        message: null,
        startedAt: null,
        recent,
      };
    }

    return {
      activeNode: inferChainNodeFromMessage(lastAction.message),
      agent: lastAction.agent,
      message: lastAction.message,
      startedAt: lastAction.createdAt,
      recent,
    };
  },
});
