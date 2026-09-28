import { defineTable } from "convex/server";
import { v } from "convex/values";

export const devtoolsTables = {
  devtoolsConnectCodes: defineTable({
    codeChallenge: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    organizationId: v.id("organizations"),
    redirectUri: v.string(),
    userId: v.string(),
  })
    .index("by_code_hash", ["codeHash"])
    .index("by_expires_at", ["expiresAt"]),

  devtoolsTokens: defineTable({
    createdAt: v.number(),
    label: v.string(),
    lastUsedAt: v.number(),
    organizationId: v.id("organizations"),
    tokenHash: v.string(),
    userId: v.string(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"])
    .index("by_last_used_at", ["lastUsedAt"]),
};
