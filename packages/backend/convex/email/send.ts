import { Resend, vEmailId, vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

// Initialize Resend component with event handling
export const resend: Resend = new Resend(components.resend, {
  // Disable test mode to send real emails via Resend
  // Resend handles rate limiting and safety features
  testMode: false,
  // Handle email events (delivery, bounce, etc.)
  onEmailEvent: internal.email.send.handleEmailEvent,
});

// Handle email status events from Resend webhooks
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (ctx, args) => {
    const { type } = args.event;

    const isBounce = type === "email.bounced";
    const isComplaint = type === "email.complained";

    if (isBounce || isComplaint) {
      const { to } = args.event.data;
      const recipientEmail = typeof to === "string" ? to : to[0];

      if (recipientEmail) {
        const existing = await ctx.db
          .query("emailSuppressions")
          .withIndex("by_email", (q) => q.eq("email", recipientEmail))
          .first();

        if (!existing) {
          await ctx.db.insert("emailSuppressions", {
            email: recipientEmail,
            reason: isBounce ? "hard_bounce" : "complaint",
            originalEventType: type,
            suppressedAt: Date.now(),
          });
        }
      }

      console.error(`[Email Event] ${type} for email ${args.id}`);
    }
  },
});

// Generic email sending mutation using the Resend component
export const sendEmail = internalMutation({
  args: {
    from: v.string(),
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
    headers: v.optional(
      v.array(v.object({ name: v.string(), value: v.string() }))
    ),
  },
  handler: async (ctx, args) => {
    let replyToArray: string[] | undefined;
    if (args.replyTo) {
      replyToArray =
        typeof args.replyTo === "string" ? [args.replyTo] : args.replyTo;
    }

    const emailId = await resend.sendEmail(ctx, {
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: replyToArray,
      headers: args.headers,
    });

    return emailId;
  },
});

// Batch send emails (useful for newsletters)
export const sendBatchEmails = internalMutation({
  args: {
    emails: v.array(
      v.object({
        from: v.string(),
        to: v.union(v.string(), v.array(v.string())),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
        headers: v.optional(
          v.array(v.object({ name: v.string(), value: v.string() }))
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const emailIds: string[] = [];

    for (const email of args.emails) {
      let replyToArray: string[] | undefined;
      if (email.replyTo) {
        replyToArray =
          typeof email.replyTo === "string" ? [email.replyTo] : email.replyTo;
      }

      const emailId = await resend.sendEmail(ctx, {
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: replyToArray,
        headers: email.headers,
      });
      emailIds.push(emailId);
    }

    return emailIds;
  },
});

// Check email delivery status
export const getEmailStatus = internalAction({
  args: {
    emailId: vEmailId,
  },
  handler: async (ctx, args) => {
    return await resend.status(ctx, args.emailId);
  },
});
