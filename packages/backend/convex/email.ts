import { Resend, vEmailId, vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

// Initialize Resend component with event handling
export const resend: Resend = new Resend(components.resend, {
  // Disable test mode to send real emails via Resend
  // Resend handles rate limiting and safety features
  testMode: false,
  // Handle email events (delivery, bounce, etc.)
  onEmailEvent: internal.email.handleEmailEvent,
});

// Handle email status events from Resend webhooks
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: (_ctx, args) => {
    // Log email events for debugging
    console.log(`[Email Event] ${args.event.type}:`, {
      emailId: args.id,
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
    console.log("=== RESEND: sendEmail mutation called ===");
    console.log("[Resend] From:", args.from);
    console.log("[Resend] To:", args.to);
    console.log("[Resend] Subject:", args.subject);

    try {
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
        replyTo: replyToArray,
      });

      console.log("[Resend] Email sent successfully, ID:", emailId);
      return emailId;
    } catch (error) {
      console.error("[Resend] Error sending email:", error);
      throw error;
    }
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
        replyTo: replyToArray,
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
