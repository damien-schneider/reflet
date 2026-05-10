/**
 * Saved view mutations — personal/shared per-org views for the tasks list.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "../queries/auth";
import { viewScope } from "../schema/views.tables";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

export const createView = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    scope: viewScope,
    filtersJson: v.string(),
    sortKey: v.optional(v.string()),
    groupKey: v.optional(v.string()),
    viewMode: v.optional(v.string()),
  },
  returns: v.id("userViews"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    if (args.scope === "shared") {
      await requireOrgAdmin(ctx, args.organizationId, user._id);
    }
    await requireAutopilotAccess(ctx, args.organizationId);

    const trimmed = args.name.trim();
    if (trimmed.length === 0) {
      throw new Error("View name cannot be empty");
    }

    const now = Date.now();
    return ctx.db.insert("userViews", {
      organizationId: args.organizationId,
      userId: user._id,
      name: trimmed,
      scope: args.scope,
      filtersJson: args.filtersJson,
      sortKey: args.sortKey,
      groupKey: args.groupKey,
      viewMode: args.viewMode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateView = mutation({
  args: {
    viewId: v.id("userViews"),
    name: v.optional(v.string()),
    scope: v.optional(viewScope),
    filtersJson: v.optional(v.string()),
    sortKey: v.optional(v.string()),
    groupKey: v.optional(v.string()),
    viewMode: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    await requireOrgMembership(ctx, view.organizationId, user._id);

    // Personal views are owner-only; shared views require admin.
    if (view.scope === "personal" && view.userId !== user._id) {
      throw new Error("Cannot modify another user's personal view");
    }
    if (view.scope === "shared") {
      await requireOrgAdmin(ctx, view.organizationId, user._id);
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length === 0) {
        throw new Error("View name cannot be empty");
      }
      updates.name = trimmed;
    }
    if (args.scope !== undefined) {
      if (args.scope === "shared") {
        await requireOrgAdmin(ctx, view.organizationId, user._id);
      }
      updates.scope = args.scope;
    }
    if (args.filtersJson !== undefined) {
      updates.filtersJson = args.filtersJson;
    }
    if (args.sortKey !== undefined) {
      updates.sortKey = args.sortKey;
    }
    if (args.groupKey !== undefined) {
      updates.groupKey = args.groupKey;
    }
    if (args.viewMode !== undefined) {
      updates.viewMode = args.viewMode;
    }

    await ctx.db.patch(args.viewId, updates);
    return null;
  },
});

export const deleteView = mutation({
  args: { viewId: v.id("userViews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    await requireOrgMembership(ctx, view.organizationId, user._id);

    if (view.scope === "personal" && view.userId !== user._id) {
      throw new Error("Cannot delete another user's personal view");
    }
    if (view.scope === "shared") {
      await requireOrgAdmin(ctx, view.organizationId, user._id);
    }

    await ctx.db.delete(args.viewId);
    return null;
  },
});
