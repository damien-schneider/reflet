import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { generateApiKey, hashSecretKey } from "./api_auth";

// ============================================
// ORGANIZATION API KEY MANAGEMENT
// ============================================

/**
 * Generate API keys for an organization
 */
export const generateOrganizationApiKeys = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const { organizationId, name, tagId } = args;

    const publicKey = generateApiKey("fb_pub");
    const secretKey = generateApiKey("fb_sec");
    const secretKeyHash = await hashSecretKey(secretKey);

    const apiKeyId = await ctx.db.insert("organizationApiKeys", {
      organizationId,
      name,
      tagId,
      publicKey,
      secretKeyHash,
      isActive: true,
      createdAt: Date.now(),
    });

    // Return the unhashed secret key (only shown once)
    return {
      apiKeyId,
      publicKey,
      secretKey, // Only returned on creation!
    };
  },
});

/**
 * Regenerate secret key for an organization API key
 */
export const regenerateOrganizationSecretKey = internalMutation({
  args: {
    apiKeyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    const existingKey = await ctx.db.get(args.apiKeyId);
    if (!existingKey) {
      throw new Error("API key not found");
    }

    const newSecretKey = generateApiKey("fb_sec");
    const secretKeyHash = await hashSecretKey(newSecretKey);

    await ctx.db.patch(args.apiKeyId, {
      secretKeyHash,
    });

    return {
      secretKey: newSecretKey, // Only returned on regeneration!
    };
  },
});

/**
 * Get API keys info for an organization
 */
export const getOrganizationApiKeys = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
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
 * Update organization API key settings
 */
export const updateOrganizationApiKeySettings = internalMutation({
  args: {
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
    const { apiKeyId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(apiKeyId, filteredUpdates);
    }

    return { success: true };
  },
});

/**
 * Delete an organization API key
 */
export const deleteOrganizationApiKey = internalMutation({
  args: {
    apiKeyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.apiKeyId);
    return { success: true };
  },
});
