"use node";

import { render } from "@react-email/render";
import { SupportInboxAlertEmail } from "@reflet/email/templates/support-inbox-alert-email";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { AUTOMATED_HEADERS } from "./render";

const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "notifications@mail.reflet.app";

export const send = internalAction({
  args: {
    conversationId: v.id("supportConversations"),
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    organizationSlug: v.string(),
    personLabel: v.string(),
    preview: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const conversationUrl = `${process.env.SITE_URL ?? ""}/dashboard/${args.organizationSlug}/inbox?conversation=${args.conversationId}`;
    const component = SupportInboxAlertEmail({
      conversationUrl,
      organizationName: args.organizationName,
      personLabel: args.personLabel,
      preview: args.preview,
    });

    await ctx.runMutation(internal.email.send.sendEmail, {
      emailType: "support_inbox_alert",
      from: `Reflet <${fromEmail}>`,
      headers: AUTOMATED_HEADERS,
      html: await render(component),
      organizationId: args.organizationId,
      subject: `Nouveau message de ${args.personLabel}`,
      text: await render(component, { plainText: true }),
      to: args.to,
    });
  },
});
