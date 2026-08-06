import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

export interface ApiKeyValidation {
  error?: string;
  isSecretKey?: boolean;
  organizationApiKeyId?: Id<"organizationApiKeys">;
  organizationId?: Id<"organizations">;
  /** HMAC key for widget user tokens. Server-side only, never returned to a client. */
  secretKeyHash?: string;
  success: boolean;
}

export interface ExternalUserContext {
  email?: string;
  externalId: string;
  externalUserId: Id<"externalUsers">;
  name?: string;
}

export interface ApiAuthResult {
  error?: string;
  externalUser?: ExternalUserContext;
  isSecretKey?: boolean;
  organizationApiKeyId?: Id<"organizationApiKeys">;
  organizationId?: Id<"organizations">;
  statusCode?: number;
  success: boolean;
}

/**
 * Generate a random API key
 */
export function generateApiKey(prefix: "fb_pub" | "fb_sec"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = `${prefix}_`;
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * SHA-256 hash for secret keys using Web Crypto API
 */
export async function hashSecretKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate an API key (public or secret)
 */
export const validateApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<ApiKeyValidation> => {
    const { apiKey } = args;

    // Determine key type
    const isPublicKey = apiKey.startsWith("fb_pub_");
    const isSecretKey = apiKey.startsWith("fb_sec_");

    if (!(isPublicKey || isSecretKey)) {
      return { error: "Invalid API key format", success: false };
    }

    if (isPublicKey) {
      // Look up organization API key by public key
      const orgApiKeyRecord = await ctx.db
        .query("organizationApiKeys")
        .withIndex("by_public_key", (q) => q.eq("publicKey", apiKey))
        .unique();

      if (!orgApiKeyRecord) {
        return { error: "Invalid API key", success: false };
      }

      if (!orgApiKeyRecord.isActive) {
        return { error: "API key is inactive", success: false };
      }

      return {
        isSecretKey: false,
        organizationApiKeyId: orgApiKeyRecord._id,
        organizationId: orgApiKeyRecord.organizationId,
        secretKeyHash: orgApiKeyRecord.secretKeyHash,
        success: true,
      };
    }

    // For secret keys, hash and look up by index
    const hashedKey = await hashSecretKey(apiKey);

    const orgApiKeyRecord = await ctx.db
      .query("organizationApiKeys")
      .withIndex("by_secret_key_hash", (q) => q.eq("secretKeyHash", hashedKey))
      .unique();

    if (!orgApiKeyRecord?.isActive) {
      return { error: "Invalid API key", success: false };
    }

    return {
      isSecretKey: true,
      organizationApiKeyId: orgApiKeyRecord._id,
      organizationId: orgApiKeyRecord.organizationId,
      secretKeyHash: orgApiKeyRecord.secretKeyHash,
      success: true,
    };
  },
});

/**
 * Get or create external user
 */
export const getOrCreateExternalUser = internalMutation({
  args: {
    avatar: v.optional(v.string()),
    email: v.optional(v.string()),
    externalId: v.string(),
    metadata: v.optional(v.any()),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ExternalUserContext> => {
    const { organizationId, externalId, email, name, avatar, metadata } = args;
    const now = Date.now();

    // Check for existing user by organization
    const existingUser = await ctx.db
      .query("externalUsers")
      .withIndex("by_organization_external", (q) =>
        q.eq("organizationId", organizationId).eq("externalId", externalId)
      )
      .unique();

    if (existingUser) {
      // Update last seen and any changed fields
      await ctx.db.patch(existingUser._id, {
        avatar: avatar ?? existingUser.avatar,
        email: email ?? existingUser.email,
        lastSeenAt: now,
        metadata: metadata ?? existingUser.metadata,
        name: name ?? existingUser.name,
      });

      return {
        email: email ?? existingUser.email,
        externalId: existingUser.externalId,
        externalUserId: existingUser._id,
        name: name ?? existingUser.name,
      };
    }

    // Create new external user at organization level
    const newUserId = await ctx.db.insert("externalUsers", {
      avatar,
      createdAt: now,
      email,
      externalId,
      lastSeenAt: now,
      metadata,
      name,
      organizationId,
    });

    return {
      email,
      externalId,
      externalUserId: newUserId,
      name,
    };
  },
});

/**
 * Log an API request (for rate limiting and analytics)
 */
export const logApiRequest = internalMutation({
  args: {
    endpoint: v.string(),
    ip: v.optional(v.string()),
    method: v.string(),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    organizationId: v.id("organizations"),
    statusCode: v.number(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiRequestLogs", {
      endpoint: args.endpoint,
      ip: args.ip,
      method: args.method,
      organizationApiKeyId: args.organizationApiKeyId,
      organizationId: args.organizationId,
      statusCode: args.statusCode,
      timestamp: Date.now(),
      userAgent: args.userAgent,
    });
  },
});

/**
 * Check rate limit for an API key
 */
export const checkRateLimit = internalQuery({
  args: {
    maxRequests: v.optional(v.number()), // Default 100 for public, 1000 for secret
    organizationApiKeyId: v.id("organizationApiKeys"),
    windowMs: v.optional(v.number()), // Default 60000 (1 minute)
  },
  handler: async (ctx, args) => {
    const windowMs = args.windowMs ?? 60_000;
    const maxRequests = args.maxRequests ?? 100;
    const windowStart = Date.now() - windowMs;

    // Check organization API key
    const recentRequests = await ctx.db
      .query("apiRequestLogs")
      .withIndex("by_org_key_time", (q) =>
        q
          .eq("organizationApiKeyId", args.organizationApiKeyId)
          .gt("timestamp", windowStart)
      )
      .collect();

    return {
      allowed: recentRequests.length < maxRequests,
      current: recentRequests.length,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - recentRequests.length),
      resetAt: windowStart + windowMs,
    };
  },
});
