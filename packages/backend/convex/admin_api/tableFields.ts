import { defineTable } from "convex/server";
import { v } from "convex/values";

export const adminApiTables = {
  organizationApiKeys: defineTable({
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
    name: v.string(),
    publicKey: v.string(),
    secretKeyHash: v.string(),
    allowedDomains: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_public_key", ["publicKey"])
    .index("by_secret_key_hash", ["secretKeyHash"])
    .index("by_org_tag", ["organizationId", "tagId"]),

  externalUsers: defineTable({
    organizationId: v.id("organizations"),
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_organization_external", ["organizationId", "externalId"])
    .index("by_organization_email", ["organizationId", "email"]),

  feedbackVisitors: defineTable({
    organizationId: v.id("organizations"),
    visitorId: v.string(),
    metadata: v.optional(
      v.object({
        userAgent: v.optional(v.string()),
        url: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_organization_visitor", ["organizationId", "visitorId"]),

  apiRequestLogs: defineTable({
    organizationId: v.id("organizations"),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_organization_time", ["organizationId", "timestamp"])
    .index("by_org_key_time", ["organizationApiKeyId", "timestamp"]),
};
