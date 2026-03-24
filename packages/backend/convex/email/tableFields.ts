import { defineTable } from "convex/server";
import { v } from "convex/values";

const emailEventType = v.union(
  v.literal("email.sent"),
  v.literal("email.delivered"),
  v.literal("email.delivery_delayed"),
  v.literal("email.bounced"),
  v.literal("email.complained"),
  v.literal("email.opened"),
  v.literal("email.clicked")
);

export const emailTables = {
  emailSuppressions: defineTable({
    email: v.string(),
    reason: v.union(
      v.literal("hard_bounce"),
      v.literal("complaint"),
      v.literal("manual")
    ),
    originalEventType: v.string(),
    suppressedAt: v.number(),
  }).index("by_email", ["email"]),

  emailSendLog: defineTable({
    organizationId: v.id("organizations"),
    emailType: v.union(
      v.literal("changelog_notification"),
      v.literal("feedback_shipped"),
      v.literal("weekly_digest"),
      v.literal("invitation"),
      v.literal("verification"),
      v.literal("welcome"),
      v.literal("password_reset"),
      v.literal("other")
    ),
    to: v.string(),
    subject: v.string(),
    releaseId: v.optional(v.id("releases")),
    feedbackId: v.optional(v.id("feedback")),
    resendEmailId: v.optional(v.string()),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("delivery_delayed")
    ),
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    bouncedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_type", ["organizationId", "emailType"])
    .index("by_organization_sent", ["organizationId", "sentAt"])
    .index("by_release", ["releaseId"])
    .index("by_resend_id", ["resendEmailId"]),

  emailEvents: defineTable({
    emailSendLogId: v.optional(v.id("emailSendLog")),
    resendEmailId: v.string(),
    eventType: emailEventType,
    recipientEmail: v.optional(v.string()),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_send_log", ["emailSendLogId"])
    .index("by_resend_id", ["resendEmailId"])
    .index("by_timestamp", ["timestamp"]),
};
