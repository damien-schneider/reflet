/**
 * Inbox queries — list items and get counts.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { inboxItemStatus, inboxItemType } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listInboxItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(inboxItemStatus),
    type: v.optional(inboxItemType),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
      return ctx.db
        .query("autopilotInboxItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    if (args.type) {
      const { type } = args;
      return ctx.db
        .query("autopilotInboxItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const getInboxCounts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const items = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
      total += 1;
    }

    return { counts, total };
  },
});
