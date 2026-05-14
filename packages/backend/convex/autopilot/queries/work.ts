/**
 * Work item queries — list, get, children, runs, search.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  assignedAgent,
  priority,
  workItemStatus,
  workItemType,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

const DEFAULT_LIST_LIMIT = 200;
const DEFAULT_SEARCH_LIMIT = 50;
const SEARCH_LIMIT_MAX = 50;

interface ListWorkItemsArgs {
  assignedAgent?: Doc<"autopilotWorkItems">["assignedAgent"];
  assigneeUserId?: string;
  dueBefore?: number;
  isPublicRoadmap?: boolean;
  labelIds?: Id<"workItemLabels">[];
  limit?: number;
  needsReview?: boolean;
  organizationId: Id<"organizations">;
  parentId?: Id<"autopilotWorkItems">;
  priority?: Doc<"autopilotWorkItems">["priority"];
  status?: Doc<"autopilotWorkItems">["status"];
  type?: Doc<"autopilotWorkItems">["type"];
}

export const listWorkItems = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(workItemType),
    status: v.optional(workItemStatus),
    assignedAgent: v.optional(assignedAgent),
    assigneeUserId: v.optional(v.string()),
    priority: v.optional(priority),
    needsReview: v.optional(v.boolean()),
    isPublicRoadmap: v.optional(v.boolean()),
    parentId: v.optional(v.id("autopilotWorkItems")),
    labelIds: v.optional(v.array(v.id("workItemLabels"))),
    dueBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? DEFAULT_LIST_LIMIT;
    const items = await fetchWorkItemsByBestIndex(ctx, args, limit);
    const filtered = applyFilters(items, args);
    if (args.labelIds && args.labelIds.length > 0) {
      return filterByLabels(ctx, filtered, args.labelIds);
    }
    return filtered;
  },
});

const fetchWorkItemsByBestIndex = (
  ctx: QueryCtx,
  args: ListWorkItemsArgs,
  limit: number
): Promise<Doc<"autopilotWorkItems">[]> => {
  if (args.isPublicRoadmap !== undefined) {
    const { isPublicRoadmap } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_public", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("isPublicRoadmap", isPublicRoadmap)
      )
      .order("desc")
      .take(limit);
  }

  if (args.needsReview !== undefined) {
    const { needsReview } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("needsReview", needsReview)
      )
      .order("desc")
      .take(limit);
  }

  if (args.assigneeUserId !== undefined) {
    const { assigneeUserId } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_assignee", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("assigneeUserId", assigneeUserId)
      )
      .order("desc")
      .take(limit);
  }

  if (args.type) {
    const { type } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", type)
      )
      .order("desc")
      .take(limit);
  }

  if (args.status) {
    const { status } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", status)
      )
      .order("desc")
      .take(limit);
  }

  if (args.assignedAgent) {
    const { assignedAgent: agent } = args;
    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("assignedAgent", agent)
      )
      .order("desc")
      .take(limit);
  }

  return ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .order("desc")
    .take(limit);
};

const filterByLabels = async (
  ctx: QueryCtx,
  items: Doc<"autopilotWorkItems">[],
  labelIds: Id<"workItemLabels">[]
): Promise<Doc<"autopilotWorkItems">[]> => {
  const desired = new Set(labelIds);
  const result: Doc<"autopilotWorkItems">[] = [];
  for (const item of items) {
    const links = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_work_item", (q) => q.eq("workItemId", item._id))
      .collect();
    const has = links.some((link) => desired.has(link.labelId));
    if (has) {
      result.push(item);
    }
  }
  return result;
};

export const getWorkItem = query({
  args: { workItemId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return null;
    }

    await requireOrgMembership(ctx, item.organizationId, user._id);
    return item;
  },
});

export const getChildren = query({
  args: { parentId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const parent = await ctx.db.get(args.parentId);
    if (!parent) {
      return [];
    }

    await requireOrgMembership(ctx, parent.organizationId, user._id);

    return ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const searchWorkItems = query({
  args: {
    organizationId: v.id("organizations"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const trimmed = args.query.trim();
    const limit = Math.min(
      args.limit ?? DEFAULT_SEARCH_LIMIT,
      SEARCH_LIMIT_MAX
    );
    if (trimmed.length === 0) {
      return [];
    }

    const titleMatches = await ctx.db
      .query("autopilotWorkItems")
      .withSearchIndex("search_title", (q) =>
        q.search("title", trimmed).eq("organizationId", args.organizationId)
      )
      .take(limit);

    const lowered = trimmed.toLowerCase();
    const seen = new Set(titleMatches.map((item) => item._id));

    // Augment with identifier prefix matches (search index only covers title).
    const candidates = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(500);

    for (const item of candidates) {
      if (titleMatches.length + 1 > limit) {
        break;
      }
      if (seen.has(item._id)) {
        continue;
      }
      const ident = item.identifier?.toLowerCase() ?? "";
      const tagHit = item.tags?.some((tag) =>
        tag.toLowerCase().includes(lowered)
      );
      if (ident.includes(lowered) || tagHit) {
        titleMatches.push(item);
        seen.add(item._id);
      }
    }

    return titleMatches.slice(0, limit);
  },
});

interface WorkItemFilter {
  assignedAgent?: string | null;
  dueDate?: number;
  parentId?: string | null;
  priority: string;
  status: string;
  type: string;
}

function applyFilters<T extends WorkItemFilter>(
  items: T[],
  filters: {
    type?: string;
    status?: string;
    assignedAgent?: string;
    priority?: string;
    parentId?: string;
    dueBefore?: number;
  }
): T[] {
  let result = items;

  if (filters.parentId !== undefined) {
    result = result.filter((i) => i.parentId === filters.parentId);
  }

  if (filters.priority) {
    result = result.filter((i) => i.priority === filters.priority);
  }

  if (filters.dueBefore !== undefined) {
    const cutoff = filters.dueBefore;
    result = result.filter(
      (i) => typeof i.dueDate === "number" && i.dueDate <= cutoff
    );
  }

  return result;
}
