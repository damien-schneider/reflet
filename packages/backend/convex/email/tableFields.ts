import { defineTable } from "convex/server";
import { v } from "convex/values";

const emailEventType = v.union(
  v.literal("email.sent"),
  v.literal("email.delivered"),
  v.literal("email.delivery_delayed"),
  v.literal("email.bounced"),
  v.literal("email.complained"),
  v.literal("email.opened"),
  v.literal("email.clicked"),
  v.literal("email.failed")
);

export const emailTypeValidator = v.union(
  v.literal("changelog_notification"),
  v.literal("feedback_shipped"),
  v.literal("weekly_digest"),
  v.literal("invitation"),
  v.literal("verification"),
  v.literal("welcome"),
  v.literal("password_reset"),
  v.literal("other"),
  v.literal("support_reply"),
  v.literal("support_reply_notice"),
  v.literal("support_contact_confirmation"),
  v.literal("support_forwarding_test"),
  v.literal("support_inbox_alert")
);

export const emailSendStatus = v.union(
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("bounced"),
  v.literal("complained"),
  v.literal("opened"),
  v.literal("clicked"),
  v.literal("delivery_delayed"),
  v.literal("failed")
);

export const suppressionReason = v.union(
  v.literal("hard_bounce"),
  v.literal("complaint"),
  v.literal("manual"),
  v.literal("unsubscribed")
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
    complainedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    emailType: emailTypeValidator,
    feedbackId: v.optional(v.id("feedback")),
    openedAt: v.optional(v.number()),
    organizationId: v.id("organizations"),
    releaseId: v.optional(v.id("releases")),
    resendEmailId: v.optional(v.string()),
    sentAt: v.number(),
    status: emailSendStatus,
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
    organizationId: v.optional(v.id("organizations")),
    originalEventType: v.string(),
    reason: suppressionReason,
    suppressedAt: v.number(),
  }).index("by_email_org", ["email", "organizationId"]),
};
