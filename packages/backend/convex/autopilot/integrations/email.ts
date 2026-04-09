/**
 * Email/outreach integration for Sales agent.
 *
 * Provides the ability to send actual outreach emails via Resend.
 * Flow: Sales drafts outreach → saved as document (pending_review) →
 * President approves → system sends via this integration.
 *
 * Tracks lastContactedAt and outreachCount on leads.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";

// ============================================
// EMAIL CONFIG
// ============================================

const DEFAULT_DAILY_EMAIL_LIMIT = 20;

// ============================================
// QUERIES
// ============================================

/**
 * Get outreach documents approved for sending (published email docs linked to leads).
 */
export const getApprovedOutreach = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "email")
      )
      .take(50);

    // Approved = published status + linked to a lead + not yet sent (no publishedAt)
    return docs.filter(
      (d) =>
        d.status === "published" &&
        d.linkedLeadId !== undefined &&
        d.publishedAt === undefined
    );
  },
});

/**
 * Check org email sending limits for the day.
 */
export const checkEmailLimit = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    allowed: v.boolean(),
    sentToday: v.number(),
    limit: v.number(),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const limit = config?.emailDailyLimit ?? DEFAULT_DAILY_EMAIL_LIMIT;

    // Count emails sent today via activity log
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_action", (q) =>
        q.eq("organizationId", args.organizationId).eq("action", "email.sent")
      )
      .take(200);

    const sentToday = recentActivity.filter(
      (a) => a.createdAt > oneDayAgo
    ).length;

    return {
      allowed: sentToday < limit,
      sentToday,
      limit,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Mark a lead as contacted after email is sent.
 */
export const markLeadContacted = internalMutation({
  args: {
    leadId: v.id("autopilotLeads"),
    documentId: v.id("autopilotDocuments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      return null;
    }

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.leadId, {
      status: lead.status === "discovered" ? "contacted" : lead.status,
      lastContactedAt: now,
      nextFollowUpAt: now + THREE_DAYS_MS,
      outreachCount: lead.outreachCount + 1,
      updatedAt: now,
    });

    // Mark the email document as sent
    await ctx.db.patch(args.documentId, {
      publishedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

// ============================================
// EMAIL SENDING ACTION
// ============================================

/**
 * Send approved outreach emails via Resend API.
 * Only sends emails that:
 * 1. Have been approved (published status)
 * 2. Are linked to a lead with an email
 * 3. Are not on the org's email blocklist
 * 4. Haven't exceeded the daily limit
 */
export const sendApprovedOutreach = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const orgId = args.organizationId;

    // Check email limit
    const limitCheck = await ctx.runQuery(
      internal.autopilot.integrations.email.checkEmailLimit,
      { organizationId: orgId }
    );
    if (!limitCheck.allowed) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "sales",
        level: "info",
        message: `Email sending skipped — daily limit reached (${limitCheck.sentToday}/${limitCheck.limit})`,
      });
      return;
    }

    // Get approved outreach
    const approved = await ctx.runQuery(
      internal.autopilot.integrations.email.getApprovedOutreach,
      { organizationId: orgId }
    );

    if (approved.length === 0) {
      return;
    }

    // Get config for blocklist and sender address
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: orgId,
    });
    const blocklist = new Set(config?.emailBlocklist ?? []);
    const senderEmail = config?.orgEmailAddress;

    if (!senderEmail) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "sales",
        level: "warning",
        message: "Email sending skipped — no org email address configured",
      });
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "sales",
        level: "warning",
        message: "Email sending skipped — RESEND_API_KEY not configured",
      });
      return;
    }

    let sent = 0;
    const remaining = limitCheck.limit - limitCheck.sentToday;

    for (const doc of approved.slice(0, remaining)) {
      if (!doc.linkedLeadId) {
        continue;
      }

      const lead = await ctx.runQuery(
        internal.autopilot.agents.sales_queries.getLeadById,
        { leadId: doc.linkedLeadId }
      );

      if (!lead?.email) {
        continue;
      }

      // Check blocklist
      if (blocklist.has(lead.email.toLowerCase())) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "sales",
          level: "info",
          message: `Email to ${lead.email} skipped — on blocklist`,
        });
        continue;
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [lead.email],
            subject: doc.title,
            text: doc.content,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Resend API error: ${response.status} ${error}`);
        }

        await ctx.runMutation(
          internal.autopilot.integrations.email.markLeadContacted,
          { leadId: doc.linkedLeadId, documentId: doc._id }
        );

        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "sales",
          level: "success",
          message: `Outreach email sent to ${lead.name} (${lead.email})`,
          action: "email.sent",
        });

        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          agent: "sales",
          level: "error",
          message: `Failed to send email to ${lead.email}: ${message}`,
        });
      }
    }

    if (sent > 0) {
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "sales",
        level: "success",
        message: `Outreach batch complete: ${sent} emails sent`,
      });
    }
  },
});
