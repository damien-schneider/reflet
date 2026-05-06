/**
 * Public-facing chain queries — admin UI consumes these to render DAG status.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  CHAIN_NODE_KINDS,
  CHAIN_NODE_OWNERS,
  type ChainNodeKind,
  computeChainState,
  DOC_TYPE_BY_NODE,
  DRAFT_DOC_TYPES,
  getNextActionableNodes,
} from "../chain";
import { chainNodeKind, chainNodeStatus } from "../schema/validators";
import { requireOrgMembership } from "./auth";

const DEFAULT_WAKE_THRESHOLD = 5;

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

export const getChainStatePublic = query({
  args: { organizationId: v.id("organizations") },
  returns: chainStateValidator,
  handler: async (ctx, args) => {
    return await computeChainState(ctx, args.organizationId);
  },
});

interface NodeMeta {
  avgValidationScore: number | null;
  count: number;
  lastUpdatedAt: number | null;
}

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
  };
};

const fetchDraftsMeta = async (
  ctx: { db: QueryCtx["db"] },
  orgId: Id<"organizations">
): Promise<NodeMeta> => {
  const allDocs: Doc<"autopilotDocuments">[] = [];
  for (const docType of DRAFT_DOC_TYPES) {
    const docs = await fetchDocsByType(ctx, orgId, docType);
    allDocs.push(...docs);
  }
  return aggregateDocs(allDocs);
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
      return { count: 0, lastUpdatedAt: null, avgValidationScore: null };
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
      kind: ChainNodeKind;
      lastUpdatedAt: number | null;
      owner: string;
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
