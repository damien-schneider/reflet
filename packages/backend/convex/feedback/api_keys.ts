import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { generateApiKey, hashSecretKey } from "./api_auth";

/**
 * Generate API keys for an organization
 */
export const generateOrganizationApiKeys = internalMutation({
  args: {
    name: v.string(),
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const { organizationId, name, tagId } = args;

    const publicKey = generateApiKey("fb_pub");
    const secretKey = generateApiKey("fb_sec");
    const secretKeyHash = await hashSecretKey(secretKey);

    const apiKeyId = await ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: true,
      name,
      organizationId,
      publicKey,
      secretKeyHash,
      tagId,
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
 * Update organization API key settings
 */
export const updateOrganizationApiKeySettings = internalMutation({
  args: {
    allowedDomains: v.optional(v.array(v.string())),
    apiKeyId: v.id("organizationApiKeys"),
    isActive: v.optional(v.boolean()),
    name: v.optional(v.string()),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
    tagId: v.optional(v.id("tags")),
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

/**
 * Update organization API key last used timestamp
 */
export const updateOrganizationApiKeyLastUsed = internalMutation({
  args: {
    apiKeyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
    });
  },
});
