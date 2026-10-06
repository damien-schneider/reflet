import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { isOrgMemberViewer, requireOrgMember } from "../shared/access";
import type { FeedbackStatusValue } from "../shared/validators";

import { DEFAULT_STATUSES, sortColumnsByLifecycle } from "./status_definitions";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }
    if (!(org.isPublic || (await isOrgMemberViewer(ctx, org._id)))) {
      return [];
    }

    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return sortColumnsByLifecycle(statuses);
  },
});

export const ensureDefaults = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const existingStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (existingStatuses.length > 0) {
      return sortColumnsByLifecycle(existingStatuses);
    }

    const now = Date.now();
    const createdStatuses: Array<{
      _id: Id<"organizationStatuses">;
      organizationId: Id<"organizations">;
      semanticStatus: FeedbackStatusValue;
      name: string;
      color: string;
      icon: string;
      order: number;
      createdAt: number;
      updatedAt: number;
    }> = [];

    for (const status of DEFAULT_STATUSES) {
      const id = await ctx.db.insert("organizationStatuses", {
        ...status,
        createdAt: now,
        order: status.order,
        organizationId: args.organizationId,
        updatedAt: now,
      });
      createdStatuses.push({
        _id: id,
        ...status,
        createdAt: now,
        order: status.order,
        organizationId: args.organizationId,
        updatedAt: now,
      });
    }

    return createdStatuses;
  },
});
