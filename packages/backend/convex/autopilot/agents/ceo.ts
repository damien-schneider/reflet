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
import { v } from "convex/values";
import { z } from "zod";
import { components, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalQuery,
} from "../../_generated/server";
import { MODELS } from "./models";
import { buildAgentPrompt, CEO_SYSTEM_PROMPT } from "./prompts";
import { generateObjectWithFallback } from "./shared";

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
// OPENROUTER SETUP
// ============================================

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model fallback chain for reports — prioritizes capability
const CEO_MODELS = [MODELS.SMART, MODELS.FAST] as const;

// ============================================
// CEO AGENT DEFINITION
// ============================================

export const ceoAgent = new Agent(components.agent, {
  name: "CEO Agent",
  languageModel: openrouter(MODELS.SMART),
  instructions: buildAgentPrompt(CEO_SYSTEM_PROMPT, "", ""),
  maxSteps: 5,
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

/**
 * Get detailed context for the CEO chat — includes task titles, agent states,
 * recent errors, and pending inbox details (not just aggregate counts).
 */
export const getDetailedCEOContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Recent tasks with titles (last 20)
    const recentTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(20);

    const taskSummaries = recentTasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      agent: t.assignedAgent,
    }));

    // Agent enable/disable states
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const agentStates: Record<string, boolean> = {};
    if (config) {
      const agents = [
        "pm",
        "cto",
        "dev",
        "security",
        "architect",
        "growth",
        "support",
        "analytics",
        "docs",
        "qa",
        "ops",
        "sales",
      ] as const;
      for (const agent of agents) {
        const field = `${agent}Enabled` as keyof typeof config;
        agentStates[agent] = config[field] !== false;
      }
    }

    // Recent errors (last 10)
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    const recentErrors = recentActivity
      .filter((a) => a.level === "error")
      .slice(0, 10)
      .map((a) => ({
        agent: a.agent,
        message: a.message,
        ago: Math.round((Date.now() - a.createdAt) / 60_000),
      }));

    // Pending inbox items with titles (last 10)
    const pendingInbox = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .order("desc")
      .take(10);

    const inboxSummaries = pendingInbox.map((item) => ({
      title: item.title,
      type: item.type,
      priority: item.priority,
    }));

    return {
      taskSummaries,
      agentStates,
      recentErrors,
      inboxSummaries,
      autonomyMode: config?.autonomyMode ?? "supervised",
    };
  },
});

// ============================================
// HELPER FUNCTIONS
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
      const reportOutput = await generateObjectWithFallback({
        models: CEO_MODELS,
        schema: ceoReportSchema,
        systemPrompt,
        prompt: userPrompt,
      });

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
        autoApproved: true,
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

// ============================================
// CEO V2 COORDINATION SCHEMA
// ============================================

const coordinationSchema = z.object({
  agentAssessments: z.array(
    z.object({
      agent: z.string().describe("Agent name (pm, cto, growth, etc.)"),
      status: z
        .enum(["healthy", "idle", "blocked", "needs_attention"])
        .describe("Agent operational status"),
      recommendation: z.string().describe("Action to take for this agent"),
    })
  ),
  crossAgentConflicts: z.array(
    z.object({
      agents: z.array(z.string()).describe("Conflicting agents"),
      description: z.string().describe("Nature of the conflict"),
      resolution: z.string().describe("Suggested resolution"),
    })
  ),
  priorityOverrides: z.array(
    z.object({
      taskId: z
        .string()
        .describe("Exact task ID from the provided candidate list"),
      newPriority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("New priority"),
      reason: z.string().describe("Why reprioritize"),
    })
  ),
  proactiveAlerts: z.array(
    z.object({
      title: z.string().describe("Alert title"),
      severity: z
        .enum(["info", "warning", "critical"])
        .describe("Alert severity"),
      description: z.string().describe("Alert details"),
    })
  ),
});

type CoordinationOutput = z.infer<typeof coordinationSchema>;
type CoordinationTask = Doc<"autopilotTasks">;

function countTasksByAgent(tasks: CoordinationTask[]): Record<string, number> {
  const taskCountsByAgent: Record<string, number> = {};

  for (const task of tasks) {
    taskCountsByAgent[task.assignedAgent] =
      (taskCountsByAgent[task.assignedAgent] ?? 0) + 1;
  }

  return taskCountsByAgent;
}

function buildPriorityOverrideCandidates(tasks: CoordinationTask[]) {
  const validTaskIds = new Map<string, Id<"autopilotTasks">>();

  for (const task of tasks) {
    validTaskIds.set(task._id, task._id);
  }

  const summary = tasks
    .map(
      (task) =>
        `${task._id} | ${task.status} | ${task.priority} | ${task.assignedAgent} | ${task.title}`
    )
    .join("\n");

  return {
    summary,
    validTaskIds,
  };
}

async function applyPriorityOverrides(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  overrides: CoordinationOutput["priorityOverrides"],
  validTaskIds: Map<string, Id<"autopilotTasks">>
) {
  for (const override of overrides) {
    const taskId = validTaskIds.get(override.taskId);
    if (!taskId) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId,
        agent: "orchestrator",
        level: "info",
        message: `CEO skipped invalid priority override task ID: ${override.taskId}`,
      });
      continue;
    }

    try {
      await ctx.runMutation(internal.autopilot.tasks.updateTaskPriority, {
        taskId,
        priority: override.newPriority,
      });
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId,
        agent: "orchestrator",
        level: "action",
        message: `CEO reprioritized task to ${override.newPriority}: ${override.reason}`,
      });
    } catch {
      // Task may no longer exist — skip.
    }
  }
}

async function createCoordinationAlerts(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  alerts: CoordinationOutput["proactiveAlerts"]
) {
  // CEO coordination alerts are purely internal — log them instead of
  // flooding the inbox. Only truly critical alerts (requiring human decision)
  // go to inbox. Most alerts are actionable by the system itself.
  for (const alert of alerts) {
    if (alert.severity === "info") {
      continue;
    }

    // Log all alerts as activity — visible in the dashboard activity feed
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "orchestrator",
      level: alert.severity === "critical" ? "warning" : "info",
      message: `CEO Alert: ${alert.title}`,
      details: alert.description,
    });
  }
}

// ============================================
// CEO V2 COORDINATION LOOP
// ============================================

/**
 * Run the CEO coordination loop.
 * Checks all agent statuses, detects conflicts, identifies idle agents,
 * and generates proactive alerts. Runs every 30 minutes.
 */
export const runCEOCoordination = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Get agent activity overview
      const ceoContext = await ctx.runQuery(
        internal.autopilot.agents.ceo.getCEOContext,
        { organizationId: args.organizationId }
      );

      // 2. Get pending tasks by agent
      const pendingTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        {
          organizationId: args.organizationId,
          status: "pending",
        }
      );
      const inProgressTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        {
          organizationId: args.organizationId,
          status: "in_progress",
        }
      );

      // 3. Build coordination context
      const agentActivity = Object.entries(ceoContext.activityByAgent)
        .map(([agent, count]) => `${agent}: ${count} actions in last 7d`)
        .join("\n");

      const pendingByAgent = countTasksByAgent(pendingTasks);
      const inProgressByAgent = countTasksByAgent(inProgressTasks);
      const allCandidateTasks = [...pendingTasks, ...inProgressTasks];
      const priorityOverrideCandidates =
        buildPriorityOverrideCandidates(allCandidateTasks);

      const systemPrompt = `You are the CEO coordination engine analyzing the health and alignment of all AI agents in the system.

Your job is to:
1. Assess each active agent's operational status
2. Detect conflicts between agents (duplicate work, contradictions)
3. Identify idle agents that should be doing work
4. Generate proactive alerts for emerging issues
5. Suggest priority overrides when needed

Be specific and actionable. Only flag real issues, not hypotheticals.`;

      const prompt = `Analyze the current state of all agents and generate coordination directives.

AGENT ACTIVITY (last 7 days):
${agentActivity || "No recent activity"}

PENDING TASKS BY AGENT:
${
  Object.entries(pendingByAgent)
    .map(([a, c]) => `${a}: ${c} pending`)
    .join("\n") || "None"
}

IN-PROGRESS TASKS BY AGENT:
${
  Object.entries(inProgressByAgent)
    .map(([a, c]) => `${a}: ${c} in progress`)
    .join("\n") || "None"
}

TASK STATS:
${formatTaskStats(ceoContext.taskStats)}

PENDING INBOX ITEMS: ${ceoContext.pendingInboxCount}

VALID TASK IDS FOR PRIORITY OVERRIDES:
${priorityOverrideCandidates.summary || "None"}

Only return priority overrides for task IDs from the candidate list above. If no candidate needs a change, return an empty array.

Assess each agent, identify conflicts, suggest priority changes, and raise alerts.`;

      const coordination = await generateObjectWithFallback({
        models: CEO_MODELS,
        schema: coordinationSchema,
        systemPrompt,
        prompt,
        temperature: 0,
      });

      // 4. Apply priority overrides to tasks
      await applyPriorityOverrides(
        ctx,
        args.organizationId,
        coordination.priorityOverrides,
        priorityOverrideCandidates.validTaskIds
      );

      // 5. Create alerts for critical issues
      await createCoordinationAlerts(
        ctx,
        args.organizationId,
        coordination.proactiveAlerts
      );

      // 6. Log coordination results
      const blockedAgents = coordination.agentAssessments.filter(
        (a) => a.status === "blocked" || a.status === "needs_attention"
      );

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "orchestrator",
        level: blockedAgents.length > 0 ? "warning" : "success",
        message: `CEO coordination: ${coordination.agentAssessments.length} agents assessed, ${coordination.crossAgentConflicts.length} conflicts, ${coordination.proactiveAlerts.length} alerts`,
        details: JSON.stringify({
          blockedAgents: blockedAgents.map((a) => a.agent),
          conflicts: coordination.crossAgentConflicts.length,
          priorityOverrides: coordination.priorityOverrides.length,
        }),
      });

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "orchestrator",
        level: "error",
        message: `CEO coordination failed: ${errorMessage}`,
      });

      return null;
    }
  },
});
