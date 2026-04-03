/**
 * Inbox CRUD operations — manage inbox items for approvals, alerts, and reviews.
 *
 * The inbox aggregates notifications from all agents: security alerts,
 * architect findings, CEO reports, email drafts, PR reviews, and task approvals.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  activityLogAgent,
  autopilotTaskPriority,
  inboxItemStatus,
  inboxItemType,
} from "./tableFields";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get inbox items for an organization, optionally filtered by status and/or type.
 * Ordered by createdAt descending (newest first).
 */
export const getInboxItems = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(inboxItemStatus),
    type: v.optional(inboxItemType),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.status && args.type) {
      const { type } = args;
      // Filter by both status and type
      const items = await ctx.db
        .query("autopilotInboxItems")
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
        .query("autopilotInboxItems")
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
        .query("autopilotInboxItems")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }

    // No filters — get all items for org
    return ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all pending inbox items for an organization, ordered by priority.
 * Priority order: critical > high > medium > low.
 */
export const getPendingInboxItems = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return items.sort(
      (a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  },
});

/**
 * Get a single inbox item by ID.
 */
export const getInboxItem = internalQuery({
  args: { itemId: v.id("autopilotInboxItems") },
  handler: async (ctx, args) => ctx.db.get(args.itemId),
});

/**
 * Count pending inbox items grouped by type for badge display.
 * Returns an object with type as key and count as value.
 */
export const getInboxCountsByType = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const counts: Record<string, number> = {};

    for (const item of items) {
      const key = item.type;
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return counts;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create a new inbox item.
 * Automatically sets status to "pending" and createdAt to current time.
 * Also logs the creation to autopilotActivityLog.
 */
export const createInboxItem = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: inboxItemType,
    title: v.string(),
    summary: v.string(),
    content: v.optional(v.string()),
    sourceAgent: activityLogAgent,
    priority: autopilotTaskPriority,
    actionUrl: v.optional(v.string()),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    relatedEmailId: v.optional(v.id("autopilotEmails")),
    relatedRunId: v.optional(v.id("autopilotRuns")),
    metadata: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    autoApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const itemId = await ctx.db.insert("autopilotInboxItems", {
      actionUrl: args.actionUrl,
      content: args.content,
      createdAt: now,
      expiresAt: args.expiresAt,
      metadata: args.metadata,
      organizationId: args.organizationId,
      priority: args.priority,
      relatedEmailId: args.relatedEmailId,
      relatedRunId: args.relatedRunId,
      relatedTaskId: args.relatedTaskId,
      sourceAgent: args.sourceAgent,
      status: args.autoApproved ? "auto_approved" : "pending",
      summary: args.summary,
      title: args.title,
      type: args.type,
    });

    // Log the creation
    await ctx.db.insert("autopilotActivityLog", {
      agent: args.sourceAgent,
      createdAt: now,
      level: "info",
      message: `Inbox item created: ${args.title}`,
      organizationId: args.organizationId,
    });

    return itemId;
  },
});

/**
 * Update an inbox item's status.
 * Sets reviewedAt to current time when status changes from "pending" to any terminal status.
 * Also logs the action to autopilotActivityLog.
 */
export const updateInboxItemStatus = internalMutation({
  args: {
    itemId: v.id("autopilotInboxItems"),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error(`Inbox item not found: ${args.itemId}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    // Set reviewedAt when transitioning from pending to a terminal status
    if (
      item.status === "pending" &&
      (args.status === "approved" ||
        args.status === "auto_approved" ||
        args.status === "rejected" ||
        args.status === "snoozed" ||
        args.status === "expired")
    ) {
      updates.reviewedAt = now;
    }

    await ctx.db.patch(args.itemId, updates);

    let logLevel: "success" | "warning" | "action" = "action";
    if (args.status === "approved" || args.status === "auto_approved") {
      logLevel = "success";
    } else if (args.status === "rejected") {
      logLevel = "warning";
    }

    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: logLevel,
      message: `Inbox item ${args.status}: ${item.title}`,
      organizationId: item.organizationId,
    });
  },
});

/**
 * Bulk update status for multiple inbox items.
 * Calls updateInboxItemStatus logic for each item.
 */
export const bulkUpdateStatus = internalMutation({
  args: {
    itemIds: v.array(v.id("autopilotInboxItems")),
    status: inboxItemStatus,
  },
  handler: async (ctx, args) => {
    let firstOrgId: Id<"organizations"> | undefined;

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) {
        continue; // Skip missing items
      }

      if (!firstOrgId) {
        firstOrgId = item.organizationId;
      }

      const now = Date.now();
      const updates: Record<string, unknown> = {
        status: args.status,
      };

      // Set reviewedAt when transitioning from pending
      if (
        item.status === "pending" &&
        (args.status === "approved" ||
          args.status === "auto_approved" ||
          args.status === "rejected" ||
          args.status === "snoozed" ||
          args.status === "expired")
      ) {
        updates.reviewedAt = now;
      }

      await ctx.db.patch(itemId, updates);
    }

    // Log the bulk action
    if (firstOrgId) {
      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: Date.now(),
        level: "action",
        message: `Bulk updated ${args.itemIds.length} inbox items to ${args.status}`,
        organizationId: firstOrgId,
      });
    }
  },
});

/**
 * Find and expire old items where expiresAt < current time and status is still "pending".
 * Used by a cron job to maintain inbox freshness.
 */
export const expireOldItems = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const items = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const expiredIds: string[] = [];

    for (const item of items) {
      if (item.expiresAt && item.expiresAt < now) {
        await ctx.db.patch(item._id, {
          status: "expired",
          reviewedAt: now,
        });
        expiredIds.push(item._id);
      }
    }

    // Log expiration if any items were expired
    if (expiredIds.length > 0) {
      await ctx.db.insert("autopilotActivityLog", {
        agent: "system",
        createdAt: now,
        level: "info",
        message: `Expired ${expiredIds.length} old inbox items`,
        organizationId: args.organizationId,
      });
    }

    return expiredIds.length;
  },
});
