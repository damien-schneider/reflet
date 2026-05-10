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

const TAG_MIGRATION_BATCH_LIMIT = 200;
const DEFAULT_MIGRATION_COLOR = "slate";

/**
 * Idempotent admin migration that converts the legacy free-form `tags`
 * array on each work item into proper `workItemLabels` rows + links.
 *
 * Behavior:
 *  - For each work item with a non-empty `tags` array, every tag string
 *    is matched (case-insensitive) against existing labels in the org.
 *    Missing labels are auto-created with a default color.
 *  - A link row is created for any (workItemId, labelId) pair that
 *    doesn't already exist. The work item's `tags` array is then cleared.
 *  - Items with empty/missing tags are skipped — re-running is a no-op.
 *
 * Capped at {@link TAG_MIGRATION_BATCH_LIMIT} items per call so the caller
 * can run repeatedly until `migrated === 0`.
 */
export const migrateTagsToLabels = mutation({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    migrated: v.number(),
    scanned: v.number(),
    labelsCreated: v.number(),
    linksCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const limit = Math.min(
      args.limit ?? TAG_MIGRATION_BATCH_LIMIT,
      TAG_MIGRATION_BATCH_LIMIT
    );

    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(limit);

    // Cache existing labels (case-insensitive) so we don't recreate.
    const existingLabels = await ctx.db
      .query("workItemLabels")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const labelByName = new Map<string, Id<"workItemLabels">>();
    for (const label of existingLabels) {
      labelByName.set(label.name.trim().toLowerCase(), label._id);
    }

    const now = Date.now();
    let migrated = 0;
    let scanned = 0;
    let labelsCreated = 0;
    let linksCreated = 0;

    for (const item of items) {
      scanned += 1;
      const tags = item.tags;
      if (!tags || tags.length === 0) {
        continue;
      }

      const labelIds: Id<"workItemLabels">[] = [];
      for (const rawTag of tags) {
        const tag = rawTag.trim();
        if (tag.length === 0) {
          continue;
        }
        const key = tag.toLowerCase();
        let labelId = labelByName.get(key);
        if (!labelId) {
          labelId = await ctx.db.insert("workItemLabels", {
            organizationId: args.organizationId,
            name: tag,
            color: DEFAULT_MIGRATION_COLOR,
            createdBy: user._id,
            createdAt: now,
            updatedAt: now,
          });
          labelByName.set(key, labelId);
          labelsCreated += 1;
        }
        labelIds.push(labelId);
      }

      // Add missing links — checked individually to stay idempotent.
      for (const labelId of labelIds) {
        const existingLink = await ctx.db
          .query("workItemLabelLinks")
          .withIndex("by_work_item_label", (q) =>
            q.eq("workItemId", item._id).eq("labelId", labelId)
          )
          .unique();
        if (!existingLink) {
          await ctx.db.insert("workItemLabelLinks", {
            organizationId: args.organizationId,
            workItemId: item._id,
            labelId,
            createdAt: now,
          });
          linksCreated += 1;
        }
      }

      await ctx.db.patch(item._id, { tags: [], updatedAt: now });
      migrated += 1;
    }

    return { migrated, scanned, labelsCreated, linksCreated };
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
