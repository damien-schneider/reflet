import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { recordEmailEvent } from "./events";
import { emailTypeValidator } from "./tableFields";

export const resend: Resend = new Resend(components.resend, {
  onEmailEvent: internal.email.send.handleEmailEvent,
  testMode: false,
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (ctx, args) => {
    await recordEmailEvent(ctx, args, { complaintScope: "global" });
  },
});

export const sendEmail = internalMutation({
  args: {
    emailType: v.optional(emailTypeValidator),
    feedbackId: v.optional(v.id("feedback")),
    from: v.string(),
    headers: v.optional(
      v.array(v.object({ name: v.string(), value: v.string() }))
    ),
    html: v.string(),
    organizationId: v.optional(v.id("organizations")),
    releaseId: v.optional(v.id("releases")),
    replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
    subject: v.string(),
    text: v.optional(v.string()),
    to: v.union(v.string(), v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let replyToArray: string[] | undefined;
    if (args.replyTo) {
      replyToArray =
        typeof args.replyTo === "string" ? [args.replyTo] : args.replyTo;
    }

    const emailId = await resend.sendEmail(ctx, {
      from: args.from,
      headers: args.headers,
      html: args.html,
      replyTo: replyToArray,
      subject: args.subject,
      text: args.text,
      to: args.to,
    });

    if (args.organizationId && args.emailType) {
      const recipientEmail = typeof args.to === "string" ? args.to : args.to[0];
      await ctx.db.insert("emailSendLog", {
        emailType: args.emailType,
        feedbackId: args.feedbackId,
        organizationId: args.organizationId,
        releaseId: args.releaseId,
        resendEmailId: emailId,
        sentAt: Date.now(),
        status: "sent",
        subject: args.subject,
        to: recipientEmail ?? "",
      });
    }

    return emailId;
  },
});
