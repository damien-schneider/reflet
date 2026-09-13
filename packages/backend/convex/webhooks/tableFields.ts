import { defineTable } from "convex/server";
import { v } from "convex/values";

export const WEBHOOK_EVENTS = [
  "feedback.created",
  "feedback.status_changed",
  "feedback.github_issue_created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEvent = v.union(
  v.literal("feedback.created"),
  v.literal("feedback.status_changed"),
  v.literal("feedback.github_issue_created")
);

export const webhookTables = {
  organizationWebhooks: defineTable({
    consecutiveFailures: v.number(),
    createdAt: v.number(),
    description: v.optional(v.string()),
    events: v.array(webhookEvent),
    isActive: v.boolean(),
    organizationId: v.id("organizations"),
    secret: v.string(),
    updatedAt: v.number(),
    url: v.string(),
  }).index("by_organization", ["organizationId"]),

  webhookDeliveries: defineTable({
    attempts: v.number(),
    createdAt: v.number(),
    event: webhookEvent,
    feedbackId: v.id("feedback"),
    lastError: v.optional(v.string()),
    nextAttemptAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    responseStatus: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    webhookId: v.id("organizationWebhooks"),
  })
    .index("by_webhook", ["webhookId"])
    .index("by_organization", ["organizationId"]),
};
