/**
 * Work item label mutations — CRUD and assignment.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOwnedWorkItem } from "../ownership";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

const requireOwnedLabel = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  labelId: Id<"workItemLabels">
): Promise<Doc<"workItemLabels">> => {
  const label = await ctx.db.get(labelId);
  if (!label) {
    throw new Error("Label not found");
  }
  if (label.organizationId !== organizationId) {
    throw new Error("Label does not belong to this organization");
  }
  return label;
};

export const createLabel = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    parentLabelId: v.optional(v.id("workItemLabels")),
  },
  returns: v.id("workItemLabels"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    if (args.parentLabelId !== undefined) {
      await requireOwnedLabel(ctx, args.organizationId, args.parentLabelId);
    }

    const trimmed = args.name.trim();
    if (trimmed.length === 0) {
      throw new Error("Label name cannot be empty");
    }

    const now = Date.now();
    return ctx.db.insert("workItemLabels", {
      organizationId: args.organizationId,
      name: trimmed,
      color: args.color,
      parentLabelId: args.parentLabelId,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLabel = mutation({
  args: {
    labelId: v.id("workItemLabels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    parentLabelId: v.optional(v.id("workItemLabels")),
    clearParent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const label = await ctx.db.get(args.labelId);
    if (!label) {
      throw new Error("Label not found");
    }
    await requireOrgAdmin(ctx, label.organizationId, user._id);
    await requireAutopilotAccess(ctx, label.organizationId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length === 0) {
        throw new Error("Label name cannot be empty");
      }
      updates.name = trimmed;
    }
    if (args.color !== undefined) {
      updates.color = args.color;
    }
    if (args.parentLabelId !== undefined) {
      await requireOwnedLabel(ctx, label.organizationId, args.parentLabelId);
      updates.parentLabelId = args.parentLabelId;
    } else if (args.clearParent === true) {
      updates.parentLabelId = undefined;
    }

    await ctx.db.patch(args.labelId, updates);
    return null;
  },
});

export const deleteLabel = mutation({
  args: { labelId: v.id("workItemLabels") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const label = await ctx.db.get(args.labelId);
    if (!label) {
      throw new Error("Label not found");
    }
    await requireOrgAdmin(ctx, label.organizationId, user._id);
    await requireAutopilotAccess(ctx, label.organizationId);

    // Remove all links first, then the label itself.
    const links = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_label", (q) => q.eq("labelId", args.labelId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }
    await ctx.db.delete(args.labelId);
    return null;
  },
});

export const addLabel = mutation({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    labelId: v.id("workItemLabels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }
    await requireOrgAdmin(ctx, item.organizationId, user._id);
    await requireAutopilotAccess(ctx, item.organizationId);
    await requireOwnedLabel(ctx, item.organizationId, args.labelId);

    const existing = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_work_item_label", (q) =>
        q.eq("workItemId", args.workItemId).eq("labelId", args.labelId)
      )
      .unique();
    if (existing) {
      return null;
    }

    await ctx.db.insert("workItemLabelLinks", {
      organizationId: item.organizationId,
      workItemId: args.workItemId,
      labelId: args.labelId,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const removeLabel = mutation({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    labelId: v.id("workItemLabels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }
    await requireOrgAdmin(ctx, item.organizationId, user._id);
    await requireAutopilotAccess(ctx, item.organizationId);

    const link = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_work_item_label", (q) =>
        q.eq("workItemId", args.workItemId).eq("labelId", args.labelId)
      )
      .unique();
    if (link) {
      await ctx.db.delete(link._id);
    }
    return null;
  },
});

export const setLabels = mutation({
  args: {
    workItemId: v.id("autopilotWorkItems"),
    labelIds: v.array(v.id("workItemLabels")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      throw new Error("Work item not found");
    }
    await requireOrgAdmin(ctx, item.organizationId, user._id);
    await requireAutopilotAccess(ctx, item.organizationId);
    await requireOwnedWorkItem(ctx, item.organizationId, args.workItemId);

    // Validate all labels belong to org.
    for (const labelId of args.labelIds) {
      await requireOwnedLabel(ctx, item.organizationId, labelId);
    }

    const existingLinks = await ctx.db
      .query("workItemLabelLinks")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.workItemId))
      .collect();

    const desiredSet = new Set<Id<"workItemLabels">>(args.labelIds);
    const existingMap = new Map<
      Id<"workItemLabels">,
      Doc<"workItemLabelLinks">
    >();
    for (const link of existingLinks) {
      existingMap.set(link.labelId, link);
    }

    // Remove links not in desired set.
    for (const [labelId, link] of existingMap.entries()) {
      if (!desiredSet.has(labelId)) {
        await ctx.db.delete(link._id);
      }
    }

    // Add new links.
    const now = Date.now();
    for (const labelId of args.labelIds) {
      if (!existingMap.has(labelId)) {
        await ctx.db.insert("workItemLabelLinks", {
          organizationId: item.organizationId,
          workItemId: args.workItemId,
          labelId,
          createdAt: now,
        });
      }
    }

    return null;
  },
});
