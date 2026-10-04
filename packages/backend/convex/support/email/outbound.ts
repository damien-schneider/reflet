import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import { isSupportRecipientSuppressed } from "../../email/suppression";
import { rateLimiter } from "../../shared/rate_limits";
import { resolveAssignedUser } from "../people";
import { findThreadToken } from "../thread_tokens";
import { supportResend } from "./client";
import {
  findSupportEmailSettings,
  resolveCustomerDelivery,
} from "./delivery_policy";
import { outboundSkipReason } from "./tableFields";

const MAX_REFERENCED_MESSAGE_IDS = 10;
const NOTICE_THROTTLE_MS = 30 * 60 * 1000;

const customerDelivery = v.union(
  v.object({ from: v.string(), kind: v.literal("full"), to: v.string() }),
  v.object({ kind: v.literal("notice"), to: v.string() }),
  v.object({
    kind: v.literal("none"),
    reason: v.union(
      v.literal("no_email"),
      v.literal("suppressed"),
      v.literal("paused"),
      v.literal("unverified_contact")
    ),
  })
);

const earlierThreadMessages = async (
  ctx: QueryCtx,
  message: Doc<"supportMessages">
): Promise<Doc<"supportMessages">[]> => {
  const upToMessage = await ctx.db
    .query("supportMessages")
    .withIndex("by_conversation_created", (q) =>
      q
        .eq("conversationId", message.conversationId)
        .lte("createdAt", message.createdAt)
    )
    .collect();
  return upToMessage.filter(
    (earlier) => earlier._creationTime < message._creationTime
  );
};

const threadMessageIds = async (
  ctx: QueryCtx,
  earlierMessages: Doc<"supportMessages">[]
): Promise<string[]> => {
  const ids: string[] = [];
  for (const earlier of earlierMessages) {
    if (earlier.outboundEmail?.status === "sent") {
      ids.push(earlier.outboundEmail.rfcMessageId);
    }
    const inbound = earlier.inboundEmailId
      ? await ctx.db.get(earlier.inboundEmailId)
      : null;
    if (inbound?.rfcMessageId) {
      ids.push(inbound.rfcMessageId);
    }
  }
  return ids.slice(-MAX_REFERENCED_MESSAGE_IDS);
};

export const getDeliveryContext = internalQuery({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    const conversation = message && (await ctx.db.get(message.conversationId));
    const organization =
      conversation && (await ctx.db.get(conversation.organizationId));
    if (!(message && conversation && organization)) {
      return null;
    }
    const token = await findThreadToken(ctx, conversation._id);
    if (!token) {
      throw new Error("Thread token missing for an admin reply");
    }
    const author = await resolveAssignedUser(ctx, message.senderId);
    const earlierMessages = await earlierThreadMessages(ctx, message);

    return {
      authorName: author?.name,
      body: message.body,
      delivery: await resolveCustomerDelivery(ctx, conversation),
      opensThread: earlierMessages.length === 0,
      organizationId: organization._id,
      organizationName: organization.name,
      referencedMessageIds: await threadMessageIds(ctx, earlierMessages),
      subject: conversation.subject,
      token,
    };
  },
  returns: v.union(
    v.object({
      authorName: v.optional(v.string()),
      body: v.string(),
      delivery: customerDelivery,
      opensThread: v.boolean(),
      organizationId: v.id("organizations"),
      organizationName: v.string(),
      referencedMessageIds: v.array(v.string()),
      subject: v.optional(v.string()),
      token: v.string(),
    }),
    v.null()
  ),
});

export const markOutboundSkipped = internalMutation({
  args: { messageId: v.id("supportMessages"), reason: outboundSkipReason },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      outboundEmail: { reason: args.reason, status: "skipped" },
    });
    return null;
  },
  returns: v.null(),
});

const supportEmailType = v.union(
  v.literal("support_reply"),
  v.literal("support_reply_notice"),
  v.literal("support_contact_confirmation"),
  v.literal("support_forwarding_test")
);

type SupportEmailType = Infer<typeof supportEmailType>;

const withinRateLimits = async (
  ctx: MutationCtx,
  emailType: SupportEmailType,
  scope: { organizationId: Id<"organizations">; to: string }
): Promise<boolean> => {
  if (emailType === "support_reply") {
    const { ok } = await rateLimiter.limit(ctx, "supportDomainEmailPerOrg", {
      key: scope.organizationId,
      throws: false,
    });
    return ok;
  }
  if (emailType === "support_forwarding_test") {
    return true;
  }
  if (emailType === "support_reply_notice") {
    const perRecipient = await rateLimiter.limit(
      ctx,
      "supportNoticePerRecipient",
      { key: scope.to, throws: false }
    );
    if (!perRecipient.ok) {
      return false;
    }
  }
  const perOrg = await rateLimiter.limit(ctx, "supportNoticePerOrg", {
    key: scope.organizationId,
    throws: false,
  });
  return perOrg.ok;
};

const noticeRecentlySent = async (
  ctx: MutationCtx,
  messageId: Id<"supportMessages">,
  now: number
): Promise<boolean> => {
  const message = await ctx.db.get(messageId);
  const conversation = message && (await ctx.db.get(message.conversationId));
  return (
    conversation?.customerNoticeSentAt !== undefined &&
    conversation.customerNoticeSentAt > now - NOTICE_THROTTLE_MS
  );
};

const skipReasonBeforeSending = async (
  ctx: MutationCtx,
  args: {
    emailType: SupportEmailType;
    organizationId: Id<"organizations">;
    to: string;
  }
) => {
  if (await isSupportRecipientSuppressed(ctx, args.to, args.organizationId)) {
    return "suppressed" as const;
  }
  const settings = await findSupportEmailSettings(ctx, args.organizationId);
  if (settings?.sendingPausedAt !== undefined) {
    return "paused" as const;
  }
  if (!(await withinRateLimits(ctx, args.emailType, args))) {
    return "rate_limited" as const;
  }
  return null;
};

export const sendSupportEmail = internalMutation({
  args: {
    emailType: supportEmailType,
    from: v.string(),
    headers: v.optional(
      v.array(v.object({ name: v.string(), value: v.string() }))
    ),
    html: v.string(),
    organizationId: v.id("organizations"),
    reply: v.optional(
      v.object({
        messageId: v.id("supportMessages"),
        rfcMessageId: v.string(),
      })
    ),
    replyTo: v.optional(v.string()),
    subject: v.string(),
    text: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isNotice = args.emailType === "support_reply_notice";
    if (
      isNotice &&
      args.reply &&
      (await noticeRecentlySent(ctx, args.reply.messageId, now))
    ) {
      return { status: "throttled" as const };
    }

    const skipReason = await skipReasonBeforeSending(ctx, args);
    if (skipReason) {
      if (args.reply) {
        await ctx.db.patch(args.reply.messageId, {
          outboundEmail: { reason: skipReason, status: "skipped" },
        });
      }
      return { reason: skipReason, status: "skipped" as const };
    }

    const resendEmailId = await supportResend.sendEmail(ctx, {
      from: args.from,
      headers: args.headers,
      html: args.html,
      replyTo: args.replyTo ? [args.replyTo] : undefined,
      subject: args.subject,
      text: args.text,
      to: args.to,
    });
    const sendLogId = await ctx.db.insert("emailSendLog", {
      emailType: args.emailType,
      organizationId: args.organizationId,
      resendEmailId,
      sentAt: now,
      status: "sent",
      subject: args.subject,
      to: args.to,
    });

    if (args.reply) {
      const message = await ctx.db.get(args.reply.messageId);
      await ctx.db.patch(args.reply.messageId, {
        outboundEmail: {
          mode: isNotice ? "notice" : "full",
          rfcMessageId: args.reply.rfcMessageId,
          sendLogId,
          status: "sent",
        },
      });
      if (isNotice && message) {
        await ctx.db.patch(message.conversationId, {
          customerNoticeSentAt: now,
        });
      }
    }
    return { sendLogId, status: "sent" as const };
  },
  returns: v.union(
    v.object({ sendLogId: v.id("emailSendLog"), status: v.literal("sent") }),
    v.object({ reason: outboundSkipReason, status: v.literal("skipped") }),
    v.object({ status: v.literal("throttled") })
  ),
});
