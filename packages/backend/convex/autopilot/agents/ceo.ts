/**
 * CEO Agent — AI product advisor and strategic partner.
 *
 * Phase 3.1: The CEO Agent is the always-available AI product advisor,
 * visible as a right-side panel. It uses the @convex-dev/agent framework
 * for thread-based conversation and has access to all product data:
 * feedback, tasks, revenue, intelligence, and agent activity.
 *
 * Capabilities:
 * - Provide strategic recommendations based on data
 * - Generate periodic CEO reports (weekly, daily, on-demand)
 * - Explain what other agents are doing and why
 * - Create tasks and trigger agents
 * - Approve/reject inbox items
 * - Send reports and insights to the inbox
 * - Analyze revenue, competitor alerts, and product health
 */

import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { components, internal } from "../../_generated/api";
import { internalAction, internalQuery } from "../../_generated/server";

// ============================================
// CEO REPORT SCHEMA
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
      metrics: z.optional(
        z.array(
          z.object({
            label: z
              .string()
              .describe("Metric label (e.g., 'Conversion Rate')"),
            value: z.string().describe("Metric value with unit"),
            trend: z.optional(
              z.enum(["up", "down", "stable"]).describe("Trend direction")
            ),
          })
        )
      ),
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

type CEOReportOutput = z.infer<typeof ceoReportSchema>;

// ============================================
// OPENROUTER SETUP
// ============================================

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model fallback chain for reports — prioritizes capability
const CEO_MODELS = ["anthropic/claude-sonnet-4", "openai/gpt-4o-mini"] as const;

// ============================================
// CEO AGENT DEFINITION
// ============================================

export const ceoAgent = new Agent(components.agent, {
  name: "CEO Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are an AI CEO and strategic product advisor for the user's product.

You have access to comprehensive product data: user feedback, development tasks, revenue metrics, competitive intelligence, and agent activity logs. You are the always-available AI partner visible in a right-side panel.

**Your Core Responsibilities:**

1. **Strategic Guidance**: Provide data-driven product recommendations, market analysis, and competitive insights. Help the user make informed decisions about priorities and direction.

2. **Product Intelligence**: Access and synthesize information from:
   - User feedback and voting patterns
   - Completed and in-progress tasks
   - Revenue and financial metrics
   - Competitor intelligence and market signals
   - Agent activity and automation status

3. **Task & Agent Management**: Create new tasks, trigger specialized agents (PM, CTO, Security, Growth), and explain what each agent is working on and why.

4. **Inbox & Approvals**: Review and approve/reject inbox items, including security alerts, architect findings, email drafts, and revenue reports.

5. **Reporting**: Generate comprehensive reports on product health, including:
   - Weekly executive summaries
   - Revenue analysis and opportunities
   - Feature completion rates
   - User satisfaction trends
   - Competitive positioning

6. **Explaining Agent Work**: Help the user understand what other agents (PM, CTO, Security, Architect, Growth) are doing, their findings, and recommendations.

**Tone & Approach:**
- Professional but approachable — be direct and friendly
- Data-driven — base recommendations on metrics and evidence
- Strategic — think about long-term product direction and sustainability
- Collaborative — work with other agents and the user to achieve goals
- Transparent — explain your reasoning and surface assumptions

**Key Principles:**
- Always cite data when making recommendations
- Highlight both opportunities and risks
- Consider user experience and business metrics equally
- Be honest about trade-offs and constraints
- Keep recommendations actionable and prioritized

You are not just a chatbot — you are a true strategic partner in building the product.`,
});

// ============================================
// CEO CONTEXT QUERY
// ============================================

/**
 * Build comprehensive context about product state for the CEO agent.
 * Returns aggregated data: task stats, activity, feedback, revenue.
 */
export const getCEOContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Get task statistics
    const allTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const taskStats = {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === "pending").length,
      inProgress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      failed: allTasks.filter((t) => t.status === "failed").length,
      byPriority: {
        critical: allTasks.filter((t) => t.priority === "critical").length,
        high: allTasks.filter((t) => t.priority === "high").length,
        medium: allTasks.filter((t) => t.priority === "medium").length,
        low: allTasks.filter((t) => t.priority === "low").length,
      },
    };

    // Get recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activityInRange = recentActivity.filter(
      (a) => a.createdAt >= sevenDaysAgo
    );

    const activityByAgent: Record<string, number> = {};
    for (const activity of activityInRange) {
      activityByAgent[activity.agent] =
        (activityByAgent[activity.agent] ?? 0) + 1;
    }

    // Get feedback statistics
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeFeedback = allFeedback.filter(
      (f) => !(f.deletedAt || f.isMerged)
    );
    const feedbackStats = {
      total: activeFeedback.length,
      byStatus: {} as Record<string, number>,
    };

    for (const feedback of activeFeedback) {
      const status = feedback.status ?? "uncategorized";
      feedbackStats.byStatus[status] =
        (feedbackStats.byStatus[status] ?? 0) + 1;
    }

    // Get inbox items (pending and recent)
    const inboxItems = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const pendingInboxItems = inboxItems.filter(
      (item) => item.status === "pending"
    );

    return {
      taskStats,
      activityByAgent,
      recentActivityCount: activityInRange.length,
      feedbackStats,
      pendingInboxCount: pendingInboxItems.length,
      inboxItemsByType: inboxItems.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate object with fallback model chain.
 * Tries each model in CEO_MODELS until one succeeds.
 */
const generateObjectWithFallback = async (
  systemPrompt: string,
  userPrompt: string
): Promise<CEOReportOutput> => {
  let lastError: Error | null = null;

  for (const modelId of CEO_MODELS) {
    try {
      const response = await generateObject({
        model: openrouter(modelId),
        schema: ceoReportSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      return response.object;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `All CEO models failed. Last error: ${lastError?.message ?? "Unknown error"}`
  );
};

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

/**
 * Format task stats for report context.
 */
const formatTaskStats = (stats: TaskStats): string => {
  return `
- Total Tasks: ${stats.total}
- Pending: ${stats.pending} | In Progress: ${stats.inProgress} | Completed: ${stats.completed} | Failed: ${stats.failed}
- By Priority: Critical (${stats.byPriority.critical}) | High (${stats.byPriority.high}) | Medium (${stats.byPriority.medium}) | Low (${stats.byPriority.low})
  `.trim();
};

/**
 * Format activity stats for report context.
 */
const formatActivityStats = (
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
// CEO ACTIONS
// ============================================

/**
 * Generate a CEO report (weekly, daily, or on-demand).
 *
 * Creates a structured report analyzing product health, tasks, feedback,
 * and revenue. Results are stored in the inbox as a ceo_report item.
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
      // 1. Get comprehensive context
      const ceoContext = await ctx.runQuery(
        internal.autopilot.agents.ceo.getCEOContext,
        { organizationId: args.organizationId }
      );

      // 2. Build report content
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

      // 3. Generate report
      const reportOutput = await generateObjectWithFallback(
        systemPrompt,
        userPrompt
      );

      // 4. Create inbox item with the report
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
        sourceAgent: "orchestrator" as const,
        priority: "high" as const,
        metadata: JSON.stringify({
          reportType: args.reportType,
          healthScore: reportOutput.overallHealthScore,
        }),
      });

      // 5. Log the report generation
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "orchestrator",
        level: "success",
        message: `CEO ${args.reportType} report generated`,
        details: `Health score: ${reportOutput.overallHealthScore}/100 | Recommendations: ${reportOutput.recommendations.length}`,
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log the error
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "orchestrator",
        level: "error",
        message: "CEO report generation failed",
        details: errorMessage,
      });

      throw new Error(`CEO report generation failed: ${errorMessage}`);
    }
  },
});
