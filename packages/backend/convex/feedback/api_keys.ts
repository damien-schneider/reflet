import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
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
