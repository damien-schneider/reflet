import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { isOrgMemberViewer, requireOrgMember } from "../shared/access";
import { getAuthUser } from "../shared/utils";

import { DEFAULT_STATUSES } from "./status_definitions";

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

    return statuses.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { id: v.id("organizationStatuses") },
  handler: async (ctx, args) => {
    const status = await ctx.db.get(args.id);
    if (!status) {
      return null;
    }
    const org = await ctx.db.get(status.organizationId);
    if (!org) {
      return null;
    }
    const canView =
      org.isPublic || (await isOrgMemberViewer(ctx, status.organizationId));
    return canView ? status : null;
  },
});

export const createDefaults = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const existingStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existingStatuses) {
      return []; // Already initialized
    }

    const now = Date.now();
    const statusIds: Id<"organizationStatuses">[] = [];

    for (const status of DEFAULT_STATUSES) {
      const id = await ctx.db.insert("organizationStatuses", {
        ...status,
        createdAt: now,
        order: status.order,
        organizationId: args.organizationId,
        updatedAt: now,
      });
      statusIds.push(id);
    }

    return statusIds;
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
      return existingStatuses.sort((a, b) => a.order - b.order);
    }

    const now = Date.now();
    const createdStatuses: Array<{
      _id: Id<"organizationStatuses">;
      organizationId: Id<"organizations">;
      semanticStatus?: import("../shared/validators").FeedbackStatusValue;
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
