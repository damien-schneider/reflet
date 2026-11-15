"use node";

import { render } from "@react-email/render";
import { NewFeedbackAlertEmail } from "@reflet/email/templates/new-feedback-alert-email";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { AUTOMATED_HEADERS } from "../support/email/render";
import { feedbackDashboardPath } from "./new_feedback";

const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "notifications@mail.reflet.app";

export const send = internalAction({
  args: {
    authorEmail: v.optional(v.string()),
    awaitingApproval: v.boolean(),
    excerpt: v.string(),
    feedbackId: v.id("feedback"),
    feedbackTitle: v.string(),
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    organizationSlug: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const component = NewFeedbackAlertEmail({
      authorEmail: args.authorEmail,
      awaitingApproval: args.awaitingApproval,
      excerpt: args.excerpt,
      feedbackTitle: args.feedbackTitle,
      feedbackUrl: `${process.env.SITE_URL ?? ""}${feedbackDashboardPath(args.organizationSlug, args.feedbackId)}`,
      organizationName: args.organizationName,
    });

    await ctx.runMutation(internal.email.send.sendEmail, {
      emailType: "new_feedback_alert",
      feedbackId: args.feedbackId,
      from: `Reflet <${fromEmail}>`,
      headers: AUTOMATED_HEADERS,
      html: await render(component),
      organizationId: args.organizationId,
      subject: `Nouveau feedback : ${args.feedbackTitle}`,
      text: await render(component, { plainText: true }),
      to: args.to,
    });
    return null;
  },
  returns: v.null(),
});
