import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

// Default statuses to create for new organizations (used as roadmap columns)
const DEFAULT_STATUSES = [
  { color: "#6b7280", icon: "clock", name: "Backlog", order: 0 },
  { color: "#3b82f6", icon: "calendar", name: "Planned", order: 1 },
  { color: "#8b5cf6", icon: "spinner", name: "In Progress", order: 2 },
  { color: "#22c55e", icon: "check-circle", name: "Done", order: 3 },
] as const;

/**
 * List all statuses for an organization (ordered)
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
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
  handler: (ctx, args) => ctx.db.get(args.id),
});

export const createDefaults = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Check if statuses already exist
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
        color: status.color,
        createdAt: now,
        icon: status.icon,
        name: status.name,
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
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if statuses already exist
    const existingStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (existingStatuses) {
      // Already has statuses, return the list
      const allStatuses = await ctx.db
        .query("organizationStatuses")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      return allStatuses.sort((a, b) => a.order - b.order);
    }

    // Create default statuses
    const now = Date.now();
    const createdStatuses: Array<{
      _id: Id<"organizationStatuses">;
      organizationId: Id<"organizations">;
      name: string;
      color: string;
      icon: string;
      order: number;
      createdAt: number;
      updatedAt: number;
    }> = [];

    for (const status of DEFAULT_STATUSES) {
      const id = await ctx.db.insert("organizationStatuses", {
        color: status.color,
        createdAt: now,
        icon: status.icon,
        name: status.name,
        order: status.order,
        organizationId: args.organizationId,
        updatedAt: now,
      });
      createdStatuses.push({
        _id: id,
        color: status.color,
        createdAt: now,
        icon: status.icon,
        name: status.name,
        order: status.order,
        organizationId: args.organizationId,
        updatedAt: now,
      });
    }

    return createdStatuses;
  },
});
