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
    const resendEmailId = String(args.id);
    const now = Date.now();

    // Look up the send log entry for this email
    const sendLog = await ctx.db
      .query("emailSendLog")
      .withIndex("by_resend_id", (q) => q.eq("resendEmailId", resendEmailId))
      .first();

    // Extract recipient email from event data
    const eventData = args.event.data;
    let recipientEmail: string | undefined;
    if ("to" in eventData) {
      const { to } = eventData;
      recipientEmail = typeof to === "string" ? to : to[0];
    }

    // Log the raw event
    await ctx.db.insert("emailEvents", {
      emailSendLogId: sendLog?._id,
      resendEmailId,
      eventType: type as
        | "email.sent"
        | "email.delivered"
        | "email.delivery_delayed"
        | "email.bounced"
        | "email.complained"
        | "email.opened"
        | "email.clicked",
      recipientEmail,
      timestamp: now,
    });

    // Update send log status
    const statusMap: Record<string, string> = {
      "email.delivered": "delivered",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.delivery_delayed": "delivery_delayed",
    };
    const timestampMap: Record<string, string> = {
      "email.delivered": "deliveredAt",
      "email.opened": "openedAt",
      "email.clicked": "clickedAt",
      "email.bounced": "bouncedAt",
    };

    const newStatus = sendLog ? statusMap[type] : undefined;

    if (sendLog && newStatus) {
      const patch: Record<string, unknown> = {
        status: newStatus,
      };
      const timestampField = timestampMap[type];
      if (timestampField) {
        patch[timestampField] = now;
      }
      await ctx.db.patch(sendLog._id, patch);
    }

    // Handle suppressions for bounces and complaints
    const isBounce = type === "email.bounced";
    const isComplaint = type === "email.complained";

    if (!(isBounce || isComplaint)) {
      return;
    }

    if (!recipientEmail) {
      return;
    }

    const existing = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", recipientEmail))
      .first();

    if (!existing) {
      await ctx.db.insert("emailSuppressions", {
        email: recipientEmail,
        reason: isBounce ? "hard_bounce" : "complaint",
        originalEventType: type,
        suppressedAt: now,
      });
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
    organizationId: v.optional(v.id("organizations")),
    emailType: v.optional(
      v.union(
        v.literal("changelog_notification"),
        v.literal("feedback_shipped"),
        v.literal("weekly_digest"),
        v.literal("invitation"),
        v.literal("verification"),
        v.literal("welcome"),
        v.literal("password_reset"),
        v.literal("other")
      )
    ),
    releaseId: v.optional(v.id("releases")),
    feedbackId: v.optional(v.id("feedback")),
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

    // Log to emailSendLog if tracking params provided
    if (args.organizationId && args.emailType) {
      const recipientEmail = typeof args.to === "string" ? args.to : args.to[0];
      await ctx.db.insert("emailSendLog", {
        organizationId: args.organizationId,
        emailType: args.emailType,
        to: recipientEmail ?? "",
        subject: args.subject,
        releaseId: args.releaseId,
        feedbackId: args.feedbackId,
        resendEmailId: emailId,
        status: "sent",
        sentAt: Date.now(),
      });
    }

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
