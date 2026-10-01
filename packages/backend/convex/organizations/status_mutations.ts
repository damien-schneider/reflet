import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { changeFeedbackStatus } from "../feedback/status_change";
import { getAuthUser } from "../shared/utils";
import { feedbackStatus } from "../shared/validators";

export const create = mutation({
  args: {
    color: v.string(),
    icon: v.optional(v.string()),
    name: v.string(),
    organizationId: v.id("organizations"),
    semanticStatus: v.optional(feedbackStatus),
  },
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

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can create statuses");
    }

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
      semanticStatus: args.semanticStatus ?? "open",
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
    semanticStatus: v.optional(feedbackStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", status.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update statuses");
    }

    if (
      args.semanticStatus &&
      status.semanticStatus &&
      args.semanticStatus !== status.semanticStatus
    ) {
      throw new Error(
        "Lifecycle meaning is stable; create a new status to change it"
      );
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
    for (const [order, statusId] of args.statusIds.entries()) {
      const status = await ctx.db.get(statusId);
      if (status?.organizationId !== args.organizationId) {
        throw new Error("Status not found");
      }
      await ctx.db.patch(statusId, { order, updatedAt: now });
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

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", status.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can delete statuses");
    }

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_org_status_id", (q) =>
        q.eq("organizationStatusId", args.id)
      )
      .collect();

    for (const feedback of feedbackItems) {
      await changeFeedbackStatus(ctx, feedback, {
        actorId: user._id,
        organizationStatusId: args.moveToStatusId,
        source: "user",
      });
    }

    await ctx.db.delete(args.id);

    return true;
  },
});
