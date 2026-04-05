/**
 * Activity log queries.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

const TICKER_ACTIVITY_LIMIT = 10;
const FILTERED_ACTIVITY_LIMIT = 200;

export const listActivity = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listTickerActivity = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(TICKER_ACTIVITY_LIMIT);
  },
});

export const listActivityByType = query({
  args: {
    organizationId: v.id("organizations"),
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_action", (q) =>
        q.eq("organizationId", args.organizationId).eq("action", args.action)
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listActivityFiltered = query({
  args: {
    organizationId: v.id("organizations"),
    agent: v.optional(v.string()),
    level: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
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

    if (args.agent) {
      results = results.filter((r) => r.agent === args.agent);
    }

    if (args.level) {
      results = results.filter((r) => r.level === args.level);
    }

    return results;
  },
});
