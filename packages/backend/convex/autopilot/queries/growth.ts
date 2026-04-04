/**
 * Growth item queries.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { growthItemStatus, growthItemType } from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listGrowthItems = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(growthItemStatus),
    type: v.optional(growthItemType),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? 50;

    if (args.status) {
      const { status } = args;
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    if (args.type) {
      const { type } = args;
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});
