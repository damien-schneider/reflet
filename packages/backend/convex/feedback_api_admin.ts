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
 * Get API keys info for an organization (admin only)
 */
export const getApiKeys = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get API keys
    const keys = await ctx.db
      .query("organizationApiKeys")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return keys.map((key) => ({
      apiKeyId: key._id,
      name: key.name,
      publicKey: key.publicKey,
      tagId: key.tagId,
      isActive: key.isActive,
      allowedDomains: key.allowedDomains,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    }));
  },
});

/**
 * List external users for an organization (admin only)
 */
export const listExternalUsers = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get external users
    const externalUsers = await ctx.db
      .query("externalUsers")
      .withIndex("by_organization_external", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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
 * Generate API keys for an organization (admin only)
 */
export const generateApiKeys = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    apiKeyId: Id<"organizationApiKeys">;
    publicKey: string;
    secretKey: string;
  }> => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Generate keys
    const result = await ctx.runMutation(
      internal.feedback_api_auth.generateOrganizationApiKeys,
      {
        organizationId: args.organizationId,
        name: args.name,
        tagId: args.tagId,
      }
    );

    return result;
  },
});

/**
 * Regenerate secret key for an organization API key (admin only)
 */
export const regenerateSecretKey = mutation({
  args: {
    organizationId: v.id("organizations"),
    apiKeyId: v.id("organizationApiKeys"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    secretKey: string;
  }> => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Verify the API key belongs to this organization
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.organizationId !== args.organizationId) {
      throw new Error("API key not found");
    }

    // Regenerate secret key
    const result = await ctx.runMutation(
      internal.feedback_api_auth.regenerateOrganizationSecretKey,
      {
        apiKeyId: args.apiKeyId,
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
    organizationId: v.id("organizations"),
    apiKeyId: v.id("organizationApiKeys"),
    name: v.optional(v.string()),
    tagId: v.optional(v.id("tags")),
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

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check admin permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to manage API keys");
    }

    // Verify the API key belongs to this organization
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.organizationId !== args.organizationId) {
      throw new Error("API key not found");
    }

    // Update settings
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.tagId !== undefined) {
      updates.tagId = args.tagId;
    }
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
      await ctx.db.patch(args.apiKeyId, updates);
    }

    return { success: true };
  },
});

/**
 * Delete API key (admin only)
 */
export const deleteApiKey = mutation({
  args: {
    organizationId: v.id("organizations"),
    apiKeyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check owner permissions only
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can delete API keys");
    }

    // Verify the API key belongs to this organization
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.organizationId !== args.organizationId) {
      throw new Error("API key not found");
    }

    // Delete key
    await ctx.db.delete(args.apiKeyId);

    return { success: true };
  },
});
