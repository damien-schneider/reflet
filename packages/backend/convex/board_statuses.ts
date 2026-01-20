import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./utils";

// Default statuses to create for new boards
const DEFAULT_STATUSES = [
  { name: "Open", color: "#6b7280", icon: "circle", order: 0 },
  { name: "Under Review", color: "#f59e0b", icon: "eye", order: 1 },
  { name: "Planned", color: "#3b82f6", icon: "calendar", order: 2 },
  { name: "In Progress", color: "#8b5cf6", icon: "loader", order: 3 },
  { name: "Completed", color: "#22c55e", icon: "check-circle", order: 4 },
  { name: "Closed", color: "#ef4444", icon: "x-circle", order: 5 },
] as const;

/**
 * List all statuses for a board (ordered)
 */
export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return statuses.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get a single status by ID
 */
export const get = query({
  args: { id: v.id("boardStatuses") },
  handler: (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

/**
 * Create default statuses for a board
 */
export const createDefaults = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Check if statuses already exist
    const existingStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (existingStatuses) {
      return []; // Already initialized
    }

    const now = Date.now();
    const statusIds: Id<"boardStatuses">[] = [];

    for (const status of DEFAULT_STATUSES) {
      const id = await ctx.db.insert("boardStatuses", {
        boardId: args.boardId,
        name: status.name,
        color: status.color,
        icon: status.icon,
        order: status.order,
        createdAt: now,
        updatedAt: now,
      });
      statusIds.push(id);
    }

    return statusIds;
  },
});

/**
 * Create a new status for a board
 */
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Get highest order
    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order), -1);

    const now = Date.now();
    const statusId = await ctx.db.insert("boardStatuses", {
      boardId: args.boardId,
      name: args.name,
      color: args.color,
      icon: args.icon,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return statusId;
  },
});

/**
 * Update a status
 */
export const update = mutation({
  args: {
    id: v.id("boardStatuses"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    const board = await ctx.db.get(status.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Reorder statuses
 */
export const reorder = mutation({
  args: {
    boardId: v.id("boards"),
    statusIds: v.array(v.id("boardStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const now = Date.now();
    for (let i = 0; i < args.statusIds.length; i++) {
      await ctx.db.patch(args.statusIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return true;
  },
});

/**
 * Delete a status (move feedback to another status first)
 */
export const remove = mutation({
  args: {
    id: v.id("boardStatuses"),
    moveToStatusId: v.id("boardStatuses"),
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

    if (status.boardId !== targetStatus.boardId) {
      throw new Error("Statuses must be from the same board");
    }

    const board = await ctx.db.get(status.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Move all feedback to target status
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_status_id", (q) => q.eq("statusId", args.id))
      .collect();

    const now = Date.now();
    for (const feedback of feedbackItems) {
      await ctx.db.patch(feedback._id, {
        statusId: args.moveToStatusId,
        updatedAt: now,
      });
    }

    // Delete the status
    await ctx.db.delete(args.id);

    return true;
  },
});

/**
 * Get feedback count per status for a board
 */
export const getCounts = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_status_id", (q) => q.eq("statusId", status._id))
        .collect();
      counts[status._id] = feedbackItems.length;
    }

    // Also count feedback without statusId (unassigned)
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    counts.unassigned = allFeedback.filter((f) => !f.statusId).length;

    return counts;
  },
});
