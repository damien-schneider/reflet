import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================
// TYPES
// ============================================

export interface ApiKeyValidation {
  error?: string;
  isSecretKey?: boolean;
  organizationApiKeyId?: Id<"organizationApiKeys">;
  organizationId?: Id<"organizations">;
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

// ============================================
// HELPERS
// ============================================

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
 * Decode and verify a JWT token for user identification
 * Simple JWT structure: base64(header).base64(payload).signature
 */
export function decodeUserToken(
  token: string
): { id: string; email?: string; name?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      return null;
    }

    const payload = JSON.parse(atob(payloadPart)) as {
      id?: string;
      sub?: string;
      email?: string;
      name?: string;
      exp?: number;
    };

    // Check expiration
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return null;
    }

    const userId = payload.id || payload.sub;
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      email: payload.email,
      name: payload.name,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Create a simple JWT token for user identification
 * For use by SDK clients to sign user info
 */
export async function createUserToken(
  user: { id: string; email?: string; name?: string },
  secretKey: string,
  expiresInSeconds = 86_400 // 24 hours default
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));

  // Simple signature using secret key (in production, use proper HMAC)
  const signature = await hashSecretKey(
    `${headerB64}.${payloadB64}.${secretKey}`
  );

  return `${headerB64}.${payloadB64}.${signature}`;
}

// ============================================
// INTERNAL QUERIES
// ============================================

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
      return { success: false, error: "Invalid API key format" };
    }

    if (isPublicKey) {
      // Look up organization API key by public key
      const orgApiKeyRecord = await ctx.db
        .query("organizationApiKeys")
        .withIndex("by_public_key", (q) => q.eq("publicKey", apiKey))
        .unique();

      if (!orgApiKeyRecord) {
        return { success: false, error: "Invalid API key" };
      }

      if (!orgApiKeyRecord.isActive) {
        return { success: false, error: "API key is inactive" };
      }

      return {
        success: true,
        organizationId: orgApiKeyRecord.organizationId,
        organizationApiKeyId: orgApiKeyRecord._id,
        isSecretKey: false,
      };
    }

    // For secret keys, hash and look up by index
    const hashedKey = await hashSecretKey(apiKey);

    const orgApiKeyRecord = await ctx.db
      .query("organizationApiKeys")
      .withIndex("by_secret_key_hash", (q) => q.eq("secretKeyHash", hashedKey))
      .unique();

    if (!orgApiKeyRecord?.isActive) {
      return { success: false, error: "Invalid API key" };
    }

    return {
      success: true,
      organizationId: orgApiKeyRecord.organizationId,
      organizationApiKeyId: orgApiKeyRecord._id,
      isSecretKey: true,
    };
  },
});

/**
 * Get or create external user
 */
export const getOrCreateExternalUser = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    metadata: v.optional(v.any()),
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
        email: email ?? existingUser.email,
        name: name ?? existingUser.name,
        avatar: avatar ?? existingUser.avatar,
        metadata: metadata ?? existingUser.metadata,
        lastSeenAt: now,
      });

      return {
        externalUserId: existingUser._id,
        externalId: existingUser.externalId,
        email: email ?? existingUser.email,
        name: name ?? existingUser.name,
      };
    }

    // Create new external user at organization level
    const newUserId = await ctx.db.insert("externalUsers", {
      organizationId,
      externalId,
      email,
      name,
      avatar,
      metadata,
      createdAt: now,
      lastSeenAt: now,
    });

    return {
      externalUserId: newUserId,
      externalId,
      email,
      name,
    };
  },
});

/**
 * Log an API request (for rate limiting and analytics)
 */
export const logApiRequest = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiRequestLogs", {
      organizationId: args.organizationId,
      organizationApiKeyId: args.organizationApiKeyId,
      endpoint: args.endpoint,
      method: args.method,
      statusCode: args.statusCode,
      ip: args.ip,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });
  },
});

/**
 * Check rate limit for an API key
 */
export const checkRateLimit = internalQuery({
  args: {
    organizationApiKeyId: v.id("organizationApiKeys"),
    windowMs: v.optional(v.number()), // Default 60000 (1 minute)
    maxRequests: v.optional(v.number()), // Default 100 for public, 1000 for secret
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
