/**
 * Feedback Loop System — tracks user approvals/rejections to improve agent behavior.
 *
 * Every inbox item approval or rejection feeds back to the originating agent.
 * Agents query their feedback history to adapt behavior over time.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { activityLogAgent, inboxItemType } from "./tableFields";

// ============================================
// FEEDBACK TABLE FIELDS (to be added to tableFields.ts)
// ============================================

/**
 * Record feedback when a user approves or rejects an inbox item.
 * Captures the agent, item type, decision, and optional reason.
 */
export const recordFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    inboxItemId: v.id("autopilotInboxItems"),
    agent: activityLogAgent,
    itemType: inboxItemType,
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotFeedbackLog", {
      organizationId: args.organizationId,
      inboxItemId: args.inboxItemId,
      agent: args.agent,
      itemType: args.itemType,
      decision: args.decision,
      rejectionReason: args.rejectionReason,
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get a summary of feedback for a specific agent.
 * Used to inject into agent system prompts for adaptive behavior.
 */
export const getAgentFeedbackSummary = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
  },
  returns: v.object({
    totalItems: v.number(),
    approvedCount: v.number(),
    rejectedCount: v.number(),
    approvalRate: v.number(),
    recentRejectionReasons: v.array(v.string()),
    byItemType: v.array(
      v.object({
        type: v.string(),
        approved: v.number(),
        rejected: v.number(),
        rate: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const feedbackEntries = await ctx.db
      .query("autopilotFeedbackLog")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .collect();

    const approvedCount = feedbackEntries.filter(
      (f) => f.decision === "approved"
    ).length;
    const rejectedCount = feedbackEntries.filter(
      (f) => f.decision === "rejected"
    ).length;
    const totalItems = feedbackEntries.length;
    const approvalRate = totalItems === 0 ? 1 : approvedCount / totalItems;

    // Get recent rejection reasons (last 10)
    const recentRejections = feedbackEntries
      .filter((f) => f.decision === "rejected" && f.rejectionReason)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
    const recentRejectionReasons = recentRejections
      .map((r) => r.rejectionReason)
      .filter((reason): reason is string => reason !== undefined);

    // Breakdown by item type
    const typeMap = new Map<string, { approved: number; rejected: number }>();
    for (const entry of feedbackEntries) {
      const existing = typeMap.get(entry.itemType) ?? {
        approved: 0,
        rejected: 0,
      };
      if (entry.decision === "approved") {
        existing.approved++;
      } else {
        existing.rejected++;
      }
      typeMap.set(entry.itemType, existing);
    }

    const byItemType = [...typeMap.entries()].map(([type, counts]) => ({
      type,
      approved: counts.approved,
      rejected: counts.rejected,
      rate:
        counts.approved + counts.rejected === 0
          ? 1
          : counts.approved / (counts.approved + counts.rejected),
    }));

    return {
      totalItems,
      approvedCount,
      rejectedCount,
      approvalRate,
      recentRejectionReasons,
      byItemType,
    };
  },
});

/**
 * Build a prompt-friendly feedback summary string for an agent.
 */
export const buildFeedbackPromptContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const summary = await ctx.runQuery(
      internal.autopilot.feedback.getAgentFeedbackSummary,
      {
        organizationId: args.organizationId,
        agent: args.agent,
      }
    );

    if (summary.totalItems === 0) {
      return "No feedback history yet. Proceed with default behavior.";
    }

    const pctApproved = Math.round(summary.approvalRate * 100);
    const lines: string[] = [
      "YOUR RECENT PERFORMANCE:",
      `- Overall approval rate: ${pctApproved}%`,
      `- Approved: ${summary.approvedCount} | Rejected: ${summary.rejectedCount}`,
    ];

    if (summary.byItemType.length > 0) {
      lines.push("- Breakdown by type:");
      for (const entry of summary.byItemType) {
        const rate = Math.round(entry.rate * 100);
        lines.push(
          `  - ${entry.type}: ${rate}% approved (${entry.approved}/${entry.approved + entry.rejected})`
        );
      }
    }

    if (summary.recentRejectionReasons.length > 0) {
      lines.push("- Recent rejection reasons:");
      for (const reason of summary.recentRejectionReasons.slice(0, 5)) {
        lines.push(`  - "${reason}"`);
      }
    }

    lines.push("");
    lines.push("ADAPT YOUR BEHAVIOR:");
    if (summary.approvalRate < 0.6) {
      lines.push("- Your approval rate is LOW. Be more conservative.");
      lines.push(
        "- Review rejection reasons and actively change your approach."
      );
    } else if (summary.approvalRate > 0.9) {
      lines.push("- Your approval rate is HIGH. Maintain current approach.");
    } else {
      lines.push(
        "- Your approval rate is moderate. Look for patterns in rejections."
      );
    }

    return lines.join("\n");
  },
});
