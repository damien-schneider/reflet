import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

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
      allowedDomains: key.allowedDomains,
      apiKeyId: key._id,
      createdAt: key.createdAt,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      name: key.name,
      publicKey: key.publicKey,
      rateLimit: key.rateLimit,
      tagId: key.tagId,
    }));
  },
});

/**
 * List external users for an organization (admin only)
 */
export const listExternalUsers = query({
  args: {
    limit: v.optional(v.number()),
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
      avatar: u.avatar,
      createdAt: u.createdAt,
      email: u.email,
      externalId: u.externalId,
      id: u._id,
      lastSeenAt: u.lastSeenAt,
      name: u.name,
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
    name: v.string(),
    organizationId: v.id("organizations"),
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
      internal.feedback.api_keys.generateOrganizationApiKeys,
      {
        name: args.name,
        organizationId: args.organizationId,
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
    apiKeyId: v.id("organizationApiKeys"),
    organizationId: v.id("organizations"),
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
      internal.feedback.api_keys.regenerateOrganizationSecretKey,
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
    allowedDomains: v.optional(v.array(v.string())),
    apiKeyId: v.id("organizationApiKeys"),
    isActive: v.optional(v.boolean()),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
    tagId: v.optional(v.id("tags")),
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
    apiKeyId: v.id("organizationApiKeys"),
    organizationId: v.id("organizations"),
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

    if (membership?.role !== "owner") {
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
