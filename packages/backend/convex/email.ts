import { Resend } from "@convex-dev/resend";
import { v, vOnEmailEventArgs } from "@convex-dev/resend/validators";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const isProduction = process.env.NODE_ENV === "production";

// Initialize Resend component with event handling
export const resend = new Resend(components.resend, {
  // Only enable test mode in development
  testMode: !isProduction,
  // Handle email events (delivery, bounce, etc.)
  onEmailEvent: internal.email.handleEmailEvent,
});

// Handle email status events from Resend webhooks
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: (_ctx, args) => {
    // Log email events for debugging
    console.log(`[Email Event] ${args.event}:`, {
      emailId: args.emailId,
      to: args.to,
      event: args.event,
    });

    // You can add custom logic here, such as:
    // - Updating user notification preferences on bounce
    // - Tracking email open/click rates
    // - Alerting on delivery failures
  },
});

// Generic email sending mutation using the Resend component
export const sendEmail = internalMutation({
  args: {
    from: v.string(),
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    html: v.string(),
    replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
  },
  handler: async (ctx, args) => {
    const emailId = await resend.sendEmail(ctx, {
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
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
        replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const emailIds: string[] = [];

    for (const email of args.emails) {
      const emailId = await resend.sendEmail(ctx, {
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        replyTo: email.replyTo,
      });
      emailIds.push(emailId);
    }

    return emailIds;
  },
});

// Check email delivery status
export const getEmailStatus = internalAction({
  args: {
    emailId: v.string(),
  },
  handler: async (ctx, args) => {
    return await resend.status(ctx, args.emailId);
  },
});
