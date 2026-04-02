/**
 * Growth Items CRUD operations — manage blog posts, social media content, campaigns.
 *
 * Growth items are pieces of content created by the Growth Agent
 * to distribute information about shipped features and improvements.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { growthItemStatus, growthItemType } from "./tableFields";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get growth items for an organization, optionally filtered by status and/or type.
 * Ordered by createdAt descending (newest first).
 */
export const getGrowthItems = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(growthItemStatus),
    type: v.optional(growthItemType),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.status && args.type) {
      const { type } = args;
      // Filter by both status and type
      const items = await ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .collect();

      return items
        .filter((item) => item.status === args.status)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }

    if (args.status) {
      const { status } = args;
      // Filter by status only
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .take(limit);
    }

    if (args.type) {
      const { type } = args;
      // Filter by type only
      return ctx.db
        .query("autopilotGrowthItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    // No filters — get all items for org
    return ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get a single growth item by ID.
 */
export const getGrowthItem = internalQuery({
  args: { itemId: v.id("autopilotGrowthItems") },
  handler: async (ctx, args) => ctx.db.get(args.itemId),
});

/**
 * Get all pending growth items for an organization (awaiting review/approval).
 */
export const getPendingGrowthItems = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "pending_review")
      )
      .order("desc")
      .collect(),
});

/**
 * Get all published growth items for an organization.
 */
export const getPublishedGrowthItems = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) =>
    ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "published")
      )
      .order("desc")
      .collect(),
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create a new growth item.
 * Automatically sets status to "draft" and createdAt to current time.
 */
export const createGrowthItem = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: growthItemType,
    title: v.string(),
    content: v.string(),
    targetUrl: v.optional(v.string()),
    status: v.optional(growthItemStatus),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const itemId = await ctx.db.insert("autopilotGrowthItems", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      content: args.content,
      targetUrl: args.targetUrl,
      status: args.status ?? "draft",
      createdAt: now,
    });

    return itemId;
  },
});

/**
 * Update a growth item's status.
 * Sets publishedAt to current time when status changes to "published".
 */
export const updateGrowthItemStatus = internalMutation({
  args: {
    itemId: v.id("autopilotGrowthItems"),
    status: growthItemStatus,
    publishedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error(`Growth item not found: ${args.itemId}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    // Set publishedAt when status changes to "published"
    if (args.status === "published") {
      updates.publishedAt = now;
      if (args.publishedUrl) {
        updates.publishedUrl = args.publishedUrl;
      }
    }

    await ctx.db.patch(args.itemId, updates);
  },
});

/**
 * Update a growth item's content.
 */
export const updateGrowthItemContent = internalMutation({
  args: {
    itemId: v.id("autopilotGrowthItems"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error(`Growth item not found: ${args.itemId}`);
    }

    const updates: Record<string, unknown> = {};

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.content !== undefined) {
      updates.content = args.content;
    }

    if (args.targetUrl !== undefined) {
      updates.targetUrl = args.targetUrl;
    }

    await ctx.db.patch(args.itemId, updates);
  },
});

/**
 * Link a growth item to a related inbox item.
 */
export const linkToInboxItem = internalMutation({
  args: {
    growthItemId: v.id("autopilotGrowthItems"),
    inboxItemId: v.id("autopilotInboxItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.growthItemId);
    if (!item) {
      throw new Error(`Growth item not found: ${args.growthItemId}`);
    }

    await ctx.db.patch(args.growthItemId, {
      relatedInboxItemId: args.inboxItemId,
    });
  },
});

/**
 * Link a growth item to a related task.
 */
export const linkToTask = internalMutation({
  args: {
    growthItemId: v.id("autopilotGrowthItems"),
    taskId: v.id("autopilotTasks"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.growthItemId);
    if (!item) {
      throw new Error(`Growth item not found: ${args.growthItemId}`);
    }

    await ctx.db.patch(args.growthItemId, {
      relatedTaskId: args.taskId,
    });
  },
});

/**
 * Delete a growth item.
 */
export const deleteGrowthItem = internalMutation({
  args: { itemId: v.id("autopilotGrowthItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error(`Growth item not found: ${args.itemId}`);
    }

    await ctx.db.delete(args.itemId);
  },
});
