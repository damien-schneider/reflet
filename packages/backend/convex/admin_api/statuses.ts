import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { changeFeedbackStatus } from "../feedback/status_change";
import { sortColumnsByLifecycle } from "../organizations/status_definitions";
import { API_ACTOR_ID } from "../shared/actors";
import { feedbackStatus } from "../shared/validators";

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

    return sortColumnsByLifecycle(statuses).map((s) => ({
      color: s.color,
      icon: s.icon,
      id: s._id,
      name: s.name,
      order: s.order,
      semanticStatus: s.semanticStatus,
    }));
  },
});

export const createStatus = internalMutation({
  args: {
    color: v.string(),
    icon: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
    semanticStatus: v.optional(feedbackStatus),
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
      semanticStatus: args.semanticStatus ?? "open",
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

    const columns = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    if (
      !columns.some(
        (column) =>
          column._id !== args.statusId &&
          column.semanticStatus === status.semanticStatus
      )
    ) {
      throw new Error("Keep at least one column for this lifecycle state");
    }
    const orgFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const f of orgFeedback) {
      if (f.organizationStatusId === args.statusId) {
        const replacement = columns.find(
          (column) =>
            column._id !== args.statusId &&
            column.semanticStatus === status.semanticStatus
        );
        if (!replacement) {
          throw new Error("No replacement column");
        }
        await changeFeedbackStatus(ctx, f, {
          actorId: API_ACTOR_ID,
          organizationStatusId: replacement._id,
          source: "api",
        });
      }
    }

    await ctx.db.delete(args.statusId);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
