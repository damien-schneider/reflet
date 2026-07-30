import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// STATUS QUERIES
// ============================================

export const listStatuses = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return statuses.map((s) => ({
      color: s.color,
      icon: s.icon,
      id: s._id,
      name: s.name,
      order: s.order,
    }));
  },
});

// ============================================
// STATUS MUTATIONS
// ============================================

export const createStatus = internalMutation({
  args: {
    color: v.string(),
    icon: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.order), -1);

    const now = Date.now();
    const id = await ctx.db.insert("organizationStatuses", {
      color: args.color,
      createdAt: now,
      icon: args.icon,
      name: args.name,
      order: maxOrder + 1,
      organizationId: args.organizationId,
      updatedAt: now,
    });

    return { id };
  },
  returns: v.object({ id: v.id("organizationStatuses") }),
});

export const updateStatus = internalMutation({
  args: {
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    statusId: v.id("organizationStatuses"),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db.get(args.statusId);
    if (!status || status.organizationId !== args.organizationId) {
      throw new Error("Status not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.color !== undefined) {
      updates.color = args.color;
    }
    if (args.icon !== undefined) {
      updates.icon = args.icon;
    }

    await ctx.db.patch(args.statusId, updates);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const deleteStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    statusId: v.id("organizationStatuses"),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db.get(args.statusId);
    if (!status || status.organizationId !== args.organizationId) {
      throw new Error("Status not found");
    }

    // Unset this status from any feedback that uses it
    const orgFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const f of orgFeedback) {
      if (f.organizationStatusId === args.statusId) {
        await ctx.db.patch(f._id, {
          organizationStatusId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.statusId);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
