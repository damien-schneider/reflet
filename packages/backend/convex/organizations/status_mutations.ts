import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

// Default statuses to create for new organizations (used as roadmap columns)
/**
 * List all statuses for an organization (ordered)
 */
export const create = mutation({
  args: {
    color: v.string(),
    icon: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check membership (admin/owner only)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create statuses");
    }

    // Get highest order
    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order), -1);

    const now = Date.now();
    const statusId = await ctx.db.insert("organizationStatuses", {
      color: args.color,
      createdAt: now,
      icon: args.icon,
      name: args.name,
      order: maxOrder + 1,
      organizationId: args.organizationId,
      updatedAt: now,
    });

    return statusId;
  },
});

export const update = mutation({
  args: {
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    id: v.id("organizationStatuses"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    // Check membership (admin/owner only)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", status.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update statuses");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const reorder = mutation({
  args: {
    organizationId: v.id("organizations"),
    statusIds: v.array(v.id("organizationStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check membership (admin/owner only)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can reorder statuses");
    }

    const now = Date.now();
    for (let i = 0; i < args.statusIds.length; i++) {
      const statusId = args.statusIds[i];
      if (!statusId) {
        continue;
      }
      await ctx.db.patch(statusId, {
        order: i,
        updatedAt: now,
      });
    }

    return true;
  },
});

export const remove = mutation({
  args: {
    id: v.id("organizationStatuses"),
    moveToStatusId: v.id("organizationStatuses"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    const targetStatus = await ctx.db.get(args.moveToStatusId);
    if (!targetStatus) {
      throw new Error("Target status not found");
    }

    if (status.organizationId !== targetStatus.organizationId) {
      throw new Error("Statuses must be from the same organization");
    }

    // Check membership (admin/owner only)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", status.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete statuses");
    }

    // Move all feedback to target status
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_org_status_id", (q) =>
        q.eq("organizationStatusId", args.id)
      )
      .collect();

    const now = Date.now();
    for (const feedback of feedbackItems) {
      await ctx.db.patch(feedback._id, {
        organizationStatusId: args.moveToStatusId,
        updatedAt: now,
      });
    }

    // Delete the status
    await ctx.db.delete(args.id);

    return true;
  },
});
