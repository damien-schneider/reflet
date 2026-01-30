import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get API keys info for a board (admin only)
 */
export const getApiKeys = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return null;
    }

    // Get API keys
    const keys = await ctx.db
      .query("boardApiKeys")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .unique();

    if (!keys) {
      return null;
    }

    return {
      apiKeyId: keys._id,
      publicKey: keys.publicKey,
      isActive: keys.isActive,
      allowedDomains: keys.allowedDomains,
      rateLimit: keys.rateLimit,
      createdAt: keys.createdAt,
      lastUsedAt: keys.lastUsedAt,
    };
  },
});

/**
 * List external users for a board (admin only)
 */
export const listExternalUsers = query({
  args: {
    boardId: v.id("boards"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get external users
    const externalUsers = await ctx.db
      .query("externalUsers")
      .withIndex("by_board_external", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Sort by last seen, limit
    externalUsers.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    const limit = args.limit ?? 100;

    return externalUsers.slice(0, limit).map((u) => ({
      id: u._id,
      externalId: u.externalId,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    }));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Generate API keys for a board (admin only)
 */
export const generateApiKeys = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    apiKeyId: Id<"boardApiKeys">;
    publicKey: string;
    secretKey: string;
  }> => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Check if keys already exist
    const existingKeys = await ctx.db
      .query("boardApiKeys")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .unique();

    if (existingKeys) {
      throw new Error(
        "API keys already exist for this board. Use regenerate instead."
      );
    }

    // Generate keys
    const result = await ctx.runMutation(
      internal.feedback_api_auth.generateBoardApiKeys,
      {
        boardId: args.boardId,
      }
    );

    return result;
  },
});

/**
 * Regenerate secret key for a board (admin only)
 */
export const regenerateSecretKey = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    secretKey: string;
  }> => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Regenerate secret key
    const result = await ctx.runMutation(
      internal.feedback_api_auth.regenerateSecretKey,
      {
        boardId: args.boardId,
      }
    );

    return result;
  },
});

/**
 * Update API key settings (admin only)
 */
export const updateApiKeySettings = mutation({
  args: {
    boardId: v.id("boards"),
    isActive: v.optional(v.boolean()),
    allowedDomains: v.optional(v.array(v.string())),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Get existing keys
    const keys = await ctx.db
      .query("boardApiKeys")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .unique();

    if (!keys) {
      throw new Error("API keys not found for this board");
    }

    // Update settings
    const updates: Record<string, unknown> = {};
    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }
    if (args.allowedDomains !== undefined) {
      updates.allowedDomains = args.allowedDomains;
    }
    if (args.rateLimit !== undefined) {
      updates.rateLimit = args.rateLimit;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(keys._id, updates);
    }

    return { success: true };
  },
});

/**
 * Delete API keys for a board (admin only)
 */
export const deleteApiKeys = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check owner permissions only
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can delete API keys");
    }

    // Get existing keys
    const keys = await ctx.db
      .query("boardApiKeys")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .unique();

    if (!keys) {
      throw new Error("API keys not found for this board");
    }

    // Delete keys
    await ctx.db.delete(keys._id);

    return { success: true };
  },
});
