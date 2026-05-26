/**
 * Activity log queries.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  activityEntityType,
  activityLogLevel,
  assignedRole,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

const TICKER_ACTIVITY_LIMIT = 10;
const FILTERED_ACTIVITY_LIMIT = 200;
const WORK_ITEM_ACTIVITY_LIMIT = 100;

const activityLogEntryValidator = v.object({
  _id: v.id("autopilotActivityLog"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  workItemId: v.optional(v.id("autopilotWorkItems")),
  role: assignedRole,
  targetRole: v.optional(assignedRole),
  level: activityLogLevel,
  message: v.string(),
  details: v.optional(v.string()),
  action: v.optional(v.string()),
  entityType: v.optional(activityEntityType),
  entityId: v.optional(v.string()),
  createdAt: v.number(),
});

function toActivityLogEntry(entry: Doc<"autopilotActivityLog">) {
  return {
    _id: entry._id,
    _creationTime: entry._creationTime,
    organizationId: entry.organizationId,
    workItemId: entry.workItemId,
    role: entry.role,
    targetRole: entry.targetRole,
    level: entry.level,
    message: entry.message,
    details: entry.details,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    createdAt: entry.createdAt,
  };
}

export const listActivity = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const entries = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);
    return entries.map(toActivityLogEntry);
  },
});

export const listTickerActivity = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const entries = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(TICKER_ACTIVITY_LIMIT);
    return entries.map(toActivityLogEntry);
  },
});

export const listWorkItemActivity = query({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return [];
    }
    await requireOrgMembership(ctx, item.organizationId, user._id);

    const entries = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.workItemId))
      .order("desc")
      .take(args.limit ?? WORK_ITEM_ACTIVITY_LIMIT);
    return entries.map(toActivityLogEntry);
  },
});

export const listActivityByType = query({
  args: {
    organizationId: v.id("organizations"),
    action: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const entries = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_action", (q) =>
        q.eq("organizationId", args.organizationId).eq("action", args.action)
      )
      .order("desc")
      .take(args.limit ?? 50);
    return entries.map(toActivityLogEntry);
  },
});

export const listActivityFiltered = query({
  args: {
    organizationId: v.id("organizations"),
    role: v.optional(assignedRole),
    level: v.optional(activityLogLevel),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? FILTERED_ACTIVITY_LIMIT;

    let results = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    if (args.role) {
      results = results.filter((r) => r.role === args.role);
    }

    if (args.level) {
      results = results.filter((r) => r.level === args.level);
    }

    return results.map(toActivityLogEntry);
  },
});

const paginatedActivityValidator = v.object({
  page: v.array(activityLogEntryValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
  ),
});

export const listActivityPaginated = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    role: v.optional(assignedRole),
    level: v.optional(activityLogLevel),
  },
  returns: paginatedActivityValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    let q = ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (idx) =>
        idx.eq("organizationId", args.organizationId)
      )
      .order("desc");

    if (args.role) {
      const role = args.role;
      q = q.filter((f) => f.eq(f.field("role"), role));
    }
    if (args.level) {
      const level = args.level;
      q = q.filter((f) => f.eq(f.field("level"), level));
    }

    const result = await q.paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map(toActivityLogEntry),
    };
  },
});
