import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sendingPauseReason = v.union(
  v.literal("complaint_rate"),
  v.literal("bounce_rate"),
  v.literal("platform")
);

export const sendingDomainStatus = v.union(
  v.literal("not_started"),
  v.literal("pending"),
  v.literal("verified"),
  v.literal("partially_verified"),
  v.literal("partially_failed"),
  v.literal("failed"),
  v.literal("temporary_failure")
);

export const sendingDomainRecord = v.object({
  name: v.string(),
  priority: v.optional(v.number()),
  record: v.string(),
  status: v.string(),
  type: v.string(),
  value: v.string(),
});

export const inboundEmailStatus = v.union(
  v.literal("pending"),
  v.literal("appended"),
  v.literal("created"),
  v.literal("forwarding_confirmation"),
  v.literal("forwarding_verified"),
  v.literal("unrouted"),
  v.literal("rejected")
);

export const skippedAttachmentReason = v.union(
  v.literal("unsupported_type"),
  v.literal("too_large"),
  v.literal("download_failed")
);

export const attachmentFile = v.union(
  v.object({ kind: v.literal("stored"), storageId: v.id("_storage") }),
  v.object({ kind: v.literal("skipped"), reason: skippedAttachmentReason })
);

export const outboundSkipReason = v.union(
  v.literal("no_email"),
  v.literal("unverified_contact"),
  v.literal("suppressed"),
  v.literal("paused"),
  v.literal("rate_limited")
);

export const outboundDeliveryMode = v.union(
  v.literal("full"),
  v.literal("notice")
);

export const messageOutboundEmail = v.union(
  v.object({
    mode: outboundDeliveryMode,
    rfcMessageId: v.string(),
    sendLogId: v.id("emailSendLog"),
    status: v.literal("sent"),
  }),
  v.object({ reason: outboundSkipReason, status: v.literal("skipped") })
);

export const supportEmailTables = {
  supportAttachments: defineTable({
    contentType: v.string(),
    conversationId: v.id("supportConversations"),
    file: attachmentFile,
    filename: v.string(),
    messageId: v.id("supportMessages"),
    size: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"]),

  supportContacts: defineTable({
    createdAt: v.number(),
    email: v.string(),
    organizationId: v.id("organizations"),
    verificationSentAt: v.optional(v.number()),
    verificationToken: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_org_email", ["organizationId", "email"])
    .index("by_verification_token", ["verificationToken"]),

  supportEmailSettings: defineTable({
    createdAt: v.number(),
    forwardingAddress: v.optional(v.string()),
    forwardingTestCode: v.optional(v.string()),
    forwardingVerifiedAt: v.optional(v.number()),
    gmailConfirmation: v.optional(
      v.object({
        confirmationUrl: v.optional(v.string()),
        excerpt: v.string(),
        receivedAt: v.number(),
        subject: v.string(),
      })
    ),
    inboundAlias: v.optional(v.string()),
    organizationId: v.id("organizations"),
    sendingPausedAt: v.optional(v.number()),
    sendingPauseReason: v.optional(sendingPauseReason),
  })
    .index("by_organization", ["organizationId"])
    .index("by_inbound_alias", ["inboundAlias"]),

  supportInboundEmails: defineTable({
    conversationId: v.optional(v.id("supportConversations")),
    from: v.string(),
    fullText: v.optional(v.string()),
    isAutoSubmitted: v.optional(v.boolean()),
    messageId: v.optional(v.id("supportMessages")),
    organizationId: v.optional(v.id("organizations")),
    receivedAt: v.number(),
    rejectReason: v.optional(v.string()),
    resendEmailId: v.string(),
    rfcMessageId: v.optional(v.string()),
    senderAuthenticated: v.optional(v.boolean()),
    senderMismatch: v.optional(v.boolean()),
    status: inboundEmailStatus,
    subject: v.string(),
    to: v.array(v.string()),
  })
    .index("by_resend_email_id", ["resendEmailId"])
    .index("by_rfc_message_id", ["rfcMessageId"])
    .index("by_status_received", ["status", "receivedAt"]),

  supportSendingDomains: defineTable({
    createdAt: v.number(),
    domain: v.string(),
    error: v.optional(v.string()),
    fromLocalPart: v.string(),
    lastCheckedAt: v.number(),
    organizationId: v.id("organizations"),
    records: v.array(sendingDomainRecord),
    resendDomainId: v.optional(v.string()),
    status: sendingDomainStatus,
  })
    .index("by_organization", ["organizationId"])
    .index("by_domain", ["domain"])
    .index("by_status_checked", ["status", "lastCheckedAt"]),

  supportThreadTokens: defineTable({
    conversationId: v.id("supportConversations"),
    token: v.string(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_token", ["token"]),
};
