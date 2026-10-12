import { defineTable } from "convex/server";
import { v } from "convex/values";

export const teamAccessTables = {
  teamAccessCodes: defineTable({
    apiKeyId: v.id("organizationApiKeys"),
    codeChallenge: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    organizationId: v.id("organizations"),
    origin: v.string(),
    userId: v.string(),
  })
    .index("by_code_hash", ["codeHash"])
    .index("by_expires_at", ["expiresAt"]),

  teamAccessTokens: defineTable({
    apiKeyId: v.id("organizationApiKeys"),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.number(),
    organizationId: v.id("organizations"),
    origin: v.string(),
    tokenHash: v.string(),
    userId: v.string(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"])
    .index("by_expires_at", ["expiresAt"]),
};
