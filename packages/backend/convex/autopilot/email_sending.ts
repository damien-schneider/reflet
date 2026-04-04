/**
 * Email sending module for the Autopilot system — Phase 2.4.
 *
 * Manages email sending via Resend, daily limit checks, domain blocklisting,
 * and the full workflow from draft creation to approval to dispatch.
 * Integrates with inbox items for review workflows.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { resend } from "../email/send";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Check if the organization is within the daily email sending limit.
 * Returns the current sent count, limit, and whether sending is allowed.
 */
export const checkDailyEmailLimit = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get org config to access email limit
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return { allowed: false, sent: 0, limit: 0 };
    }

    const limit = config.emailDailyLimit ?? 50; // Default to 50 if not set

    // Count sent emails for today (last 24 hours)
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const sentEmails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "sent")
      )
      .collect();

    const sentToday = sentEmails.filter(
      (email) => email.sentAt && email.sentAt > oneDayAgo
    ).length;

    return {
      allowed: sentToday < limit,
      sent: sentToday,
      limit,
    };
  },
});

/**
 * Check if a recipient email domain is blocklisted for the organization.
 * Returns true if the email domain should be blocked.
 */
export const isEmailBlocked = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    recipientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Get org config to access email blocklist
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config?.emailBlocklist || config.emailBlocklist.length === 0) {
      return false;
    }

    // Extract domain from recipient email
    const emailParts = args.recipientEmail.split("@");
    if (emailParts.length !== 2) {
      return true; // Invalid email format — block it
    }

    const recipientDomain = emailParts[1].toLowerCase();

    // Check if domain is in blocklist
    for (const blockedDomain of config.emailBlocklist) {
      if (recipientDomain === blockedDomain.toLowerCase()) {
        return true;
      }
    }

    return false;
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Send an approved email via Resend.
 * Loads the email record, validates status, gets org email address,
 * sends via Resend, updates status to "sent", and logs activity.
 * On failure, reverts status to "approved" for retry.
 */
export const sendAutopilotEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    emailId: v.id("autopilotEmails"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Load the email record
    const email = await ctx.runQuery(internal.autopilot.email.getEmail, {
      emailId: args.emailId,
    });

    if (!email) {
      throw new Error(`Email not found: ${args.emailId}`);
    }

    // Validate email status is "approved"
    if (email.status !== "approved") {
      throw new Error(
        `Cannot send email with status: ${email.status}. Must be approved.`
      );
    }

    // Load org config to get the from address
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config?.orgEmailAddress) {
      throw new Error(
        `Organization email address not configured for ${args.organizationId}`
      );
    }

    const fromAddress = config.orgEmailAddress;

    // Check blocklist for all recipients
    for (const recipient of email.to) {
      const isBlocked = await ctx.runQuery(
        internal.autopilot.email_sending.isEmailBlocked,
        {
          organizationId: args.organizationId,
          recipientEmail: recipient,
        }
      );
      if (isBlocked) {
        throw new Error(
          `Recipient ${recipient} is on the email blocklist — sending blocked`
        );
      }
    }

    // Check CC recipients against blocklist
    if (email.cc) {
      for (const ccRecipient of email.cc) {
        const isBlocked = await ctx.runQuery(
          internal.autopilot.email_sending.isEmailBlocked,
          {
            organizationId: args.organizationId,
            recipientEmail: ccRecipient,
          }
        );
        if (isBlocked) {
          throw new Error(
            `CC recipient ${ccRecipient} is on the email blocklist — sending blocked`
          );
        }
      }
    }

    try {
      // Send via Resend
      const resendEmailId = await resend.sendEmail(ctx, {
        from: fromAddress,
        to: email.to,
        cc: email.cc,
        subject: email.subject,
        html: email.bodyHtml,
        text: email.bodyText,
      });

      if (!resendEmailId) {
        throw new Error("Resend did not return an email ID");
      }

      // Update email status to "sent"
      await ctx.runMutation(internal.autopilot.email.updateEmailStatus, {
        emailId: args.emailId,
        status: "sent",
      });

      // Log the successful send
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message: `Email sent successfully: ${email.subject} (Resend ID: ${resendEmailId})`,
      });
    } catch (error) {
      // Log the error
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "error",
        message: `Email send failed: ${email.subject}`,
        details: errorMessage,
      });

      // Revert status back to "approved" so user can retry
      await ctx.runMutation(internal.autopilot.email.updateEmailStatus, {
        emailId: args.emailId,
        status: "approved",
      });

      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  },
});

/**
 * Create an email draft and submit it for review (or auto-approve if autonomy level is full_auto).
 * Creates a draft email record and an inbox item for review.
 * If org's autonomyLevel is "full_auto", immediately approves and sends the email.
 */
export const sendEmailAndCreateInboxItem = internalAction({
  args: {
    organizationId: v.id("organizations"),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.string(),
    draftedByAgent: v.optional(
      v.union(
        v.literal("pm"),
        v.literal("cto"),
        v.literal("dev"),
        v.literal("growth"),
        v.literal("orchestrator"),
        v.literal("system")
      )
    ),
    threadId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create the email draft
    const emailId = await ctx.runMutation(
      internal.autopilot.email.createEmailDraft,
      {
        organizationId: args.organizationId,
        from: args.from,
        to: args.to,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        bodyText: args.bodyText,
        draftedByAgent: args.draftedByAgent,
        threadId: args.threadId,
      }
    );

    // Get org config to check autonomy level
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    const autonomyLevel = config?.autonomyLevel ?? "review_required";

    // Create inbox item for review (unless full_auto)
    if (autonomyLevel !== "full_auto") {
      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "email_draft",
        title: `Email Draft: ${args.subject}`,
        summary: `Email draft from ${args.draftedByAgent ?? "system"} to ${args.to.join(", ")}`,
        content: args.bodyText,
        sourceAgent: args.draftedByAgent ?? "system",
        priority: "high",
        relatedEmailId: emailId,
      });

      return;
    }

    // For full_auto: approve and send immediately
    await ctx.runMutation(internal.autopilot.email.markEmailApproved, {
      emailId,
    });

    await ctx.runAction(internal.autopilot.email_sending.sendAutopilotEmail, {
      organizationId: args.organizationId,
      emailId,
    });
  },
});
