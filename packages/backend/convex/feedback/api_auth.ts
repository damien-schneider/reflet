import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import { randomSecretHex } from "../shared/hmac";

const API_KEY_RANDOM_BYTES = 24;

export const findActivePublicApiKey = async (
  ctx: QueryCtx,
  publicKey: string
): Promise<Doc<"organizationApiKeys"> | null> => {
  const key = await ctx.db
    .query("organizationApiKeys")
    .withIndex("by_public_key", (q) => q.eq("publicKey", publicKey))
    .unique();
  return key?.isActive ? key : null;
};

export interface ApiKeyValidation {
  error?: string;
  isSecretKey?: boolean;
  organizationApiKeyId?: Id<"organizationApiKeys">;
  organizationId?: Id<"organizations">;
  /** HMAC key for widget user tokens. Server-side only, never returned to a client. */
  secretKeyHash?: string;
  success: boolean;
}

export function generateApiKey(prefix: "fb_pub" | "fb_sec"): string {
  return `${prefix}_${randomSecretHex(API_KEY_RANDOM_BYTES)}`;
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

/** Unsigned tokens never edit a user and never resolve to one a signed token marked `verified`. */
export const getOrCreateExternalUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    externalId: v.string(),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { organizationId, externalId, email, name, verified } = args;
    const now = Date.now();

    const existingUser = await ctx.db
      .query("externalUsers")
      .withIndex("by_organization_external", (q) =>
        q.eq("organizationId", organizationId).eq("externalId", externalId)
      )
      .unique();

    if (existingUser && !verified) {
      return existingUser.verified ? null : existingUser._id;
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: email ?? existingUser.email,
        lastSeenAt: now,
        name: name ?? existingUser.name,
        verified: true,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("externalUsers", {
      createdAt: now,
      email,
      externalId,
      lastSeenAt: now,
      name,
      organizationId,
      verified,
    });
  },
  returns: v.union(v.id("externalUsers"), v.null()),
});

export const logApiRequest = internalMutation({
  args: {
    devtoolsTokenId: v.optional(v.id("devtoolsTokens")),
    endpoint: v.string(),
    method: v.string(),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    organizationId: v.id("organizations"),
    statusCode: v.number(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiRequestLogs", { ...args, timestamp: Date.now() });
    return null;
  },
  returns: v.null(),
});
