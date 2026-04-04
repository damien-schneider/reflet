import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityLogAgent,
  autopilotTaskPriority,
  emailDirection,
  emailStatus,
  growthItemStatus,
  growthItemType,
  inboxItemStatus,
  inboxItemType,
} from "./validators";

export const commsTables = {
  autopilotEmails: defineTable({
    bodyHtml: v.string(),
    bodyText: v.string(),
    cc: v.optional(v.array(v.string())),
    createdAt: v.number(),
    direction: emailDirection,
    draftedByAgent: v.optional(activityLogAgent),
    from: v.string(),
    inReplyTo: v.optional(v.id("autopilotEmails")),
    organizationId: v.id("organizations"),
    receivedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    status: emailStatus,
    subject: v.string(),
    threadId: v.optional(v.string()),
    to: v.array(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_direction", ["organizationId", "direction"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_thread", ["threadId"]),

  autopilotGrowthItems: defineTable({
    content: v.string(),
    createdAt: v.number(),
    organizationId: v.id("organizations"),
    publishedAt: v.optional(v.number()),
    publishedUrl: v.optional(v.string()),
    relatedInboxItemId: v.optional(v.id("autopilotInboxItems")),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    status: growthItemStatus,
    targetUrl: v.optional(v.string()),
    title: v.string(),
    type: growthItemType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"]),

  autopilotInboxItems: defineTable({
    actionUrl: v.optional(v.string()),
    content: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
    organizationId: v.id("organizations"),
    priority: autopilotTaskPriority,
    relatedEmailId: v.optional(v.id("autopilotEmails")),
    relatedRunId: v.optional(v.id("autopilotRuns")),
    relatedTaskId: v.optional(v.id("autopilotTasks")),
    reviewedAt: v.optional(v.number()),
    sourceAgent: activityLogAgent,
    status: inboxItemStatus,
    summary: v.string(),
    title: v.string(),
    type: inboxItemType,
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_task", ["relatedTaskId"]),
};
