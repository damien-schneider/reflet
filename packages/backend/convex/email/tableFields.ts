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
  emailEvents: defineTable({
    emailSendLogId: v.optional(v.id("emailSendLog")),
    eventType: emailEventType,
    metadata: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    resendEmailId: v.string(),
    timestamp: v.number(),
  })
    .index("by_send_log", ["emailSendLogId"])
    .index("by_resend_id", ["resendEmailId"])
    .index("by_timestamp", ["timestamp"]),

  emailSendLog: defineTable({
    bouncedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
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
    feedbackId: v.optional(v.id("feedback")),
    openedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    releaseId: v.optional(v.id("releases")),
    resendEmailId: v.optional(v.string()),
    sentAt: v.number(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("delivery_delayed")
    ),
    subject: v.string(),
    to: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_type", ["organizationId", "emailType"])
    .index("by_organization_sent", ["organizationId", "sentAt"])
    .index("by_release", ["releaseId"])
    .index("by_resend_id", ["resendEmailId"]),
  emailSuppressions: defineTable({
    email: v.string(),
    originalEventType: v.string(),
    reason: v.union(
      v.literal("hard_bounce"),
      v.literal("complaint"),
      v.literal("manual")
    ),
    suppressedAt: v.number(),
  }).index("by_email", ["email"]),
};
