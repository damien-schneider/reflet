import { defineTable } from "convex/server";
import { v } from "convex/values";

export const adminApiTables = {
  apiRequestLogs: defineTable({
    endpoint: v.string(),
    ip: v.optional(v.string()),
    method: v.string(),
    organizationApiKeyId: v.optional(v.id("organizationApiKeys")),
    organizationId: v.id("organizations"),
    statusCode: v.number(),
    timestamp: v.number(),
    userAgent: v.optional(v.string()),
  })
    .index("by_organization_time", ["organizationId", "timestamp"])
    .index("by_org_key_time", ["organizationApiKeyId", "timestamp"]),

  externalUsers: defineTable({
    avatar: v.optional(v.string()),
    createdAt: v.number(),
    email: v.optional(v.string()),
    externalId: v.string(),
    lastSeenAt: v.number(),
    metadata: v.optional(v.any()),
    name: v.optional(v.string()),
    organizationId: v.id("organizations"),
  })
    .index("by_organization_external", ["organizationId", "externalId"])
    .index("by_organization_email", ["organizationId", "email"]),

  feedbackVisitors: defineTable({
    createdAt: v.number(),
    lastSeenAt: v.number(),
    metadata: v.optional(
      v.object({
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    organizationId: v.id("organizations"),
    visitorId: v.string(),
  }).index("by_organization_visitor", ["organizationId", "visitorId"]),
  organizationApiKeys: defineTable({
    allowedDomains: v.optional(v.array(v.string())),
    createdAt: v.number(),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    name: v.string(),
    organizationId: v.id("organizations"),
    publicKey: v.string(),
    rateLimit: v.optional(
      v.object({
        requestsPerMinute: v.number(),
      })
    ),
    secretKeyHash: v.string(),
    tagId: v.optional(v.id("tags")),
  })
    .index("by_organization", ["organizationId"])
    .index("by_public_key", ["publicKey"])
    .index("by_secret_key_hash", ["secretKeyHash"])
    .index("by_org_tag", ["organizationId", "tagId"]),
};
