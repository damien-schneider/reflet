/**
 * CEO report generation — weekly, daily, and on-demand reports.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { generateObjectWithFallback } from "../shared";
import { CEO_MODELS } from "./agent";

// ============================================
// SCHEMA
// ============================================

const ceoReportSchema = z.object({
  title: z.string().describe("Report title"),
  executiveSummary: z
    .string()
    .describe("High-level summary for busy executives"),
  sections: z.array(
    z.object({
      heading: z.string().describe("Section heading"),
      content: z.string().describe("Section content and analysis"),
      metrics: z
        .array(
          z.object({
            label: z
              .string()
              .describe("Metric label (e.g., 'Conversion Rate')"),
            value: z.string().describe("Metric value with unit"),
            trend: z.enum(["up", "down", "stable"]).describe("Trend direction"),
          })
        )
        .describe("Metrics for this section, empty array if none"),
    })
  ),
  recommendations: z.array(
    z.object({
      title: z.string().describe("Recommendation title"),
      description: z.string().describe("Detailed recommendation description"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Priority level"),
    })
  ),
  overallHealthScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall product health score 0-100"),
});

// ============================================
// HELPERS
// ============================================

interface TaskStats {
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export const formatTaskStats = (stats: TaskStats): string => {
  return `
- Total Tasks: ${stats.total}
- Pending: ${stats.pending} | In Progress: ${stats.inProgress} | Completed: ${stats.completed} | Failed: ${stats.failed}
- By Priority: Critical (${stats.byPriority.critical}) | High (${stats.byPriority.high}) | Medium (${stats.byPriority.medium}) | Low (${stats.byPriority.low})
  `.trim();
};

export const formatActivityStats = (
  activityByAgent: Record<string, number>,
  totalCount: number
): string => {
  const agentLines = Object.entries(activityByAgent)
    .sort(([, a], [, b]) => b - a)
    .map(([agent, count]) => `- ${agent}: ${count} actions`)
    .join("\n");

  return `Total recent activity: ${totalCount} actions\n${agentLines}`;
};

// ============================================
// REPORT ACTION
// ============================================

/**
 * Generate a CEO report (weekly, daily, or on-demand).
 */
export const generateCEOReport = internalAction({
  args: {
    organizationId: v.id("organizations"),
    reportType: v.union(
      v.literal("weekly"),
      v.literal("daily"),
      v.literal("on_demand")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const ceoContext = await ctx.runQuery(
        internal.autopilot.agents.ceo.queries.getCEOContext,
        { organizationId: args.organizationId }
      );

      let reportScope = "current state";
      if (args.reportType === "weekly") {
        reportScope = "last 7 days";
      } else if (args.reportType === "daily") {
        reportScope = "last 24 hours";
      }

      const systemPrompt = `You are a CEO analyzing product metrics and providing strategic guidance.
Generate a comprehensive ${args.reportType} report based on the provided data.
Focus on:
1. Product health and task completion rates
2. Emerging risks and opportunities
3. User feedback trends
4. Recommended strategic actions

Be concise but insightful. Highlight the most important metrics and trends.`;

      const userPrompt = `Generate a ${args.reportType} CEO report for the ${reportScope}.

TASK STATISTICS:
${formatTaskStats(ceoContext.taskStats)}

RECENT ACTIVITY:
${formatActivityStats(ceoContext.activityByAgent, ceoContext.recentActivityCount)}

FEEDBACK SUMMARY:
Total feedback items: ${ceoContext.feedbackStats.total}
By status: ${Object.entries(ceoContext.feedbackStats.byStatus)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(", ")}

INBOX SUMMARY:
Pending items: ${ceoContext.pendingInboxCount}
By type: ${Object.entries(ceoContext.inboxItemsByType)
        .map(([type, count]) => `${type} (${count})`)
        .join(", ")}

Generate a report that synthesizes this data into actionable insights.`;

      const reportOutput = await generateObjectWithFallback({
        models: CEO_MODELS,
        schema: ceoReportSchema,
        systemPrompt,
        prompt: userPrompt,
      });

      const reportContent = JSON.stringify({
        title: reportOutput.title,
        executiveSummary: reportOutput.executiveSummary,
        sections: reportOutput.sections,
        recommendations: reportOutput.recommendations,
        healthScore: reportOutput.overallHealthScore,
        generatedAt: new Date().toISOString(),
        reportType: args.reportType,
      });

      await ctx.runMutation(internal.autopilot.inbox.createInboxItem, {
        organizationId: args.organizationId,
        type: "ceo_report",
        title: reportOutput.title,
        summary: reportOutput.executiveSummary,
        content: reportContent,
        sourceAgent: "system" as const,
        priority: "high" as const,
        metadata: JSON.stringify({
          reportType: args.reportType,
          healthScore: reportOutput.overallHealthScore,
        }),
        autoApproved: true,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "success",
        message: `CEO ${args.reportType} report generated`,
        details: `Health score: ${reportOutput.overallHealthScore}/100 | Recommendations: ${reportOutput.recommendations.length}`,
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
        level: "error",
        message: "CEO report generation failed",
        details: errorMessage,
      });

      throw new Error(`CEO report generation failed: ${errorMessage}`);
    }
  },
});
