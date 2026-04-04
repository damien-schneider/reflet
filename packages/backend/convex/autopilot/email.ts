/**
 * Email CRUD operations for the Autopilot system.
 *
 * Manages email drafts, received emails, email threads, and approval workflows.
 * Integrates with inbox items and activity logging.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  activityLogAgent,
  emailDirection,
  emailStatus,
} from "./schema/validators";

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get emails for an organization, optionally filtered by direction and/or status.
 * Returns results ordered by createdAt descending.
 */
export const getEmails = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    direction: v.optional(emailDirection),
    limit: v.optional(v.number()),
    status: v.optional(emailStatus),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db
      .query("autopilotEmails")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.direction && args.status) {
      const { status } = args;
      // Use the by_org_status index which also filters by org
      query = ctx.db
        .query("autopilotEmails")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        );
    }

    const emails = await query.order("desc").take(limit);

    // Filter by direction if specified and we couldn't use index
    if (args.direction && !(args.status && emails.length)) {
      return emails.filter((email) => email.direction === args.direction);
    }

    return emails;
  },
});

/**
 * Get all emails in a thread by threadId, ordered by createdAt ascending.
 */
export const getEmailThread = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return emails;
  },
});

/**
 * Get a single email by ID.
 */
export const getEmail = internalQuery({
  args: {
    emailId: v.id("autopilotEmails"),
  },
  handler: async (ctx, args) => ctx.db.get(args.emailId),
});

/**
 * Count emails by status for an organization.
 * Returns object with counts per status.
 */
export const getEmailCounts = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const counts: Record<string, number> = {
      approved: 0,
      draft: 0,
      pending_review: 0,
      received: 0,
      rejected: 0,
      sent: 0,
    };

    for (const email of emails) {
      counts[email.status] = (counts[email.status] ?? 0) + 1;
    }

    return counts;
  },
});

/**
 * Get all draft emails created by a specific agent for an organization.
 */
export const getDraftsByAgent = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("autopilotEmails")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "draft")
      )
      .collect();

    return emails.filter((email) => email.draftedByAgent === args.agent);
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Create a draft email.
 * Args: organizationId, from, to (array), cc (optional array), subject,
 * bodyHtml, bodyText, inReplyTo (optional email ID), threadId (optional),
 * draftedByAgent (optional).
 */
export const createEmailDraft = internalMutation({
  args: {
    bodyHtml: v.string(),
    bodyText: v.string(),
    cc: v.optional(v.array(v.string())),
    draftedByAgent: v.optional(activityLogAgent),
    from: v.string(),
    inReplyTo: v.optional(v.id("autopilotEmails")),
    organizationId: v.id("organizations"),
    subject: v.string(),
    threadId: v.optional(v.string()),
    to: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const emailId = await ctx.db.insert("autopilotEmails", {
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      cc: args.cc,
      createdAt: now,
      direction: "outbound",
      draftedByAgent: args.draftedByAgent,
      from: args.from,
      inReplyTo: args.inReplyTo,
      organizationId: args.organizationId,
      status: "draft",
      subject: args.subject,
      threadId: args.threadId,
      to: args.to,
    });

    // Log the draft creation
    await ctx.db.insert("autopilotActivityLog", {
      agent: args.draftedByAgent ?? "system",
      createdAt: now,
      level: "info",
      message: `Email draft created: ${args.subject}`,
      organizationId: args.organizationId,
    });

    return emailId;
  },
});

/**
 * Update email status.
 * If status is "sent", sets sentAt timestamp.
 * Logs to autopilotActivityLog.
 */
export const updateEmailStatus = internalMutation({
  args: {
    emailId: v.id("autopilotEmails"),
    status: emailStatus,
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error(`Email not found: ${args.emailId}`);
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === "sent" && !email.sentAt) {
      updates.sentAt = now;
    }

    await ctx.db.patch(args.emailId, updates);

    // Log the status change
    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      details: `Email status changed to ${args.status}`,
      level: args.status === "rejected" ? "warning" : "action",
      message: `Email status updated: ${email.subject}`,
      organizationId: email.organizationId,
    });
  },
});

/**
 * Record an inbound email.
 * Sets direction to "inbound", status to "received", receivedAt to current time.
 * Also creates an inbox item of type "email_received".
 */
export const receiveEmail = internalMutation({
  args: {
    bodyHtml: v.string(),
    bodyText: v.string(),
    cc: v.optional(v.array(v.string())),
    from: v.string(),
    organizationId: v.id("organizations"),
    subject: v.string(),
    threadId: v.optional(v.string()),
    to: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert the inbound email
    const emailId = await ctx.db.insert("autopilotEmails", {
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      cc: args.cc,
      createdAt: now,
      direction: "inbound",
      from: args.from,
      organizationId: args.organizationId,
      receivedAt: now,
      status: "received",
      subject: args.subject,
      threadId: args.threadId,
      to: args.to,
    });

    // Create an inbox item for this received email
    await ctx.db.insert("autopilotInboxItems", {
      actionUrl: undefined,
      content: args.bodyText,
      createdAt: now,
      expiresAt: undefined,
      metadata: undefined,
      organizationId: args.organizationId,
      priority: "medium",
      relatedEmailId: emailId,
      relatedRunId: undefined,
      relatedTaskId: undefined,
      reviewedAt: undefined,
      sourceAgent: "system",
      status: "pending",
      summary: `Email received from ${args.from}: ${args.subject}`,
      title: `Email: ${args.subject}`,
      type: "email_received",
    });

    // Log the received email
    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: "action",
      message: `Email received: ${args.subject}`,
      organizationId: args.organizationId,
    });

    return emailId;
  },
});

/**
 * Move email from draft/pending_review to approved.
 * Updates status to "approved".
 * Returns the email data for the sending action.
 */
export const markEmailApproved = internalMutation({
  args: {
    emailId: v.id("autopilotEmails"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error(`Email not found: ${args.emailId}`);
    }

    if (email.status !== "draft" && email.status !== "pending_review") {
      throw new Error(
        `Cannot approve email with status: ${email.status}. Must be draft or pending_review.`
      );
    }

    const now = Date.now();

    await ctx.db.patch(args.emailId, {
      status: "approved",
    });

    // Log the approval
    await ctx.db.insert("autopilotActivityLog", {
      agent: "system",
      createdAt: now,
      level: "action",
      message: `Email approved: ${email.subject}`,
      organizationId: email.organizationId,
    });

    // Return the email data for sending
    return email;
  },
});
