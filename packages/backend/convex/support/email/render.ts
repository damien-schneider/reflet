"use node";

import { render } from "@react-email/render";
import { SupportContactConfirmationEmail } from "@reflet/email/templates/support-contact-confirmation-email";
import { SupportForwardingTestEmail } from "@reflet/email/templates/support-forwarding-test-email";
import { SupportReplyEmail } from "@reflet/email/templates/support-reply-email";
import { SupportReplyNoticeEmail } from "@reflet/email/templates/support-reply-notice-email";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { SUPPORT_INBOUND_DOMAIN, SUPPORT_NOTIFICATIONS_FROM } from "./client";

const MAX_DISPLAY_NAME_LENGTH = 64;
const DISPLAY_NAME_UNSAFE_CHARS = /[\r\n"<>]/g;

export const AUTOMATED_HEADERS = [
  { name: "Auto-Submitted", value: "auto-generated" },
  { name: "X-Auto-Response-Suppress", value: "All" },
];

const renderBoth = async (email: Parameters<typeof render>[0]) => ({
  html: await render(email),
  text: await render(email, { plainText: true }),
});

const sanitizedDisplayName = (name: string): string =>
  name
    .replace(DISPLAY_NAME_UNSAFE_CHARS, "")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);

const threadingHeaders = (
  rfcMessageId: string,
  referencedMessageIds: string[]
) => {
  const [inReplyTo] = referencedMessageIds.slice(-1);
  return [
    { name: "Message-ID", value: rfcMessageId },
    ...(inReplyTo
      ? [
          { name: "In-Reply-To", value: inReplyTo },
          { name: "References", value: referencedMessageIds.join(" ") },
        ]
      : []),
  ];
};

const unsubscribeHeaders = (token: string) => [
  {
    name: "List-Unsubscribe",
    value: `<${process.env.CONVEX_SITE_URL ?? ""}/resend-support-unsubscribe?t=${token}>`,
  },
  { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
];

export const deliverAdminReply = internalAction({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.support.email.outbound.getDeliveryContext,
      args
    );
    if (!context) {
      return null;
    }
    const { delivery, organizationName, token } = context;
    if (delivery.kind === "none") {
      await ctx.runMutation(
        internal.support.email.outbound.markOutboundSkipped,
        { messageId: args.messageId, reason: delivery.reason }
      );
      return null;
    }

    const threadUrl = `${process.env.SITE_URL ?? ""}/support/t/${token}`;
    const rfcMessageId = `<m.${args.messageId}.${token}@${SUPPORT_INBOUND_DOMAIN}>`;
    const shared = {
      organizationId: context.organizationId,
      reply: { messageId: args.messageId, rfcMessageId },
      replyTo: `r+${token}@${SUPPORT_INBOUND_DOMAIN}`,
      to: delivery.to,
    };
    const threading = threadingHeaders(
      rfcMessageId,
      context.referencedMessageIds
    );

    if (delivery.kind === "full") {
      const senderName = context.authorName
        ? `${context.authorName} (${organizationName})`
        : organizationName;
      const subject = context.subject ?? "Your request";
      await ctx.runMutation(internal.support.email.outbound.sendSupportEmail, {
        ...shared,
        ...(await renderBoth(
          SupportReplyEmail({
            authorName: context.authorName,
            body: context.body,
            organizationName,
            threadUrl,
          })
        )),
        emailType: "support_reply",
        from: `"${sanitizedDisplayName(senderName)}" <${delivery.from}>`,
        headers: threading,
        subject: context.opensThread ? subject : `Re: ${subject}`,
      });
      return null;
    }

    await ctx.runMutation(internal.support.email.outbound.sendSupportEmail, {
      ...shared,
      ...(await renderBoth(
        SupportReplyNoticeEmail({ organizationName, threadUrl })
      )),
      emailType: "support_reply_notice",
      from: SUPPORT_NOTIFICATIONS_FROM,
      headers: [
        ...threading,
        ...AUTOMATED_HEADERS,
        ...unsubscribeHeaders(token),
      ],
      subject: `New reply from ${organizationName}`,
    });
    return null;
  },
  returns: v.null(),
});

export const sendContactConfirmation = internalAction({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    to: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const confirmUrl = `${process.env.SITE_URL ?? ""}/support/confirm?token=${args.token}`;
    await ctx.runMutation(internal.support.email.outbound.sendSupportEmail, {
      ...(await renderBoth(
        SupportContactConfirmationEmail({
          confirmUrl,
          organizationName: args.organizationName,
        })
      )),
      emailType: "support_contact_confirmation",
      from: SUPPORT_NOTIFICATIONS_FROM,
      headers: AUTOMATED_HEADERS,
      organizationId: args.organizationId,
      subject: `Confirm your email for ${args.organizationName}`,
      to: args.to,
    });
    return null;
  },
  returns: v.null(),
});

export const sendForwardingTest = internalAction({
  args: {
    code: v.string(),
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.support.email.outbound.sendSupportEmail, {
      ...(await renderBoth(
        SupportForwardingTestEmail({ organizationName: args.organizationName })
      )),
      emailType: "support_forwarding_test",
      from: SUPPORT_NOTIFICATIONS_FROM,
      organizationId: args.organizationId,
      subject: `Reflet forwarding test [reflet-forwarding-test:${args.code}]`,
      to: args.to,
    });
    return null;
  },
  returns: v.null(),
});
