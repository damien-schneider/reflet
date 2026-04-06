/**
 * CEO coordination loop — assesses agent health, detects conflicts,
 * applies priority overrides, relays directives, and raises proactive alerts.
 * Includes bottleneck and starvation detection.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { type ActionCtx, internalAction } from "../../../_generated/server";
import { generateObjectWithFallback } from "../shared";
import { CEO_MODELS } from "./agent";
import { formatTaskStats } from "./reports";

// ============================================
// SCHEMA
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
type CoordinationTask = Doc<"autopilotWorkItems">;

// ============================================
// HELPERS
// ============================================

function countTasksByAgent(tasks: CoordinationTask[]): Record<string, number> {
  const taskCountsByAgent: Record<string, number> = {};
  for (const task of tasks) {
    if (task.assignedAgent) {
      taskCountsByAgent[task.assignedAgent] =
        (taskCountsByAgent[task.assignedAgent] ?? 0) + 1;
    }
  }
  return taskCountsByAgent;
}

function buildPriorityOverrideCandidates(tasks: CoordinationTask[]) {
  const validTaskIds = new Map<string, Id<"autopilotWorkItems">>();
  for (const task of tasks) {
    validTaskIds.set(task._id, task._id);
  }
  const summary = tasks
    .map(
      (task) =>
        `${task._id} | ${task.status} | ${task.priority} | ${task.assignedAgent} | ${task.title}`
    )
    .join("\n");
  return { summary, validTaskIds };
}

async function applyPriorityOverrides(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  overrides: CoordinationOutput["priorityOverrides"],
  validTaskIds: Map<string, Id<"autopilotWorkItems">>
) {
  for (const override of overrides) {
    const taskId = validTaskIds.get(override.taskId);
    if (!taskId) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId,
        agent: "system",
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
        agent: "system",
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
  for (const alert of alerts) {
    if (alert.severity === "info") {
      continue;
    }
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "system",
      level: alert.severity === "critical" ? "warning" : "info",
      message: `CEO Alert: ${alert.title}`,
      details: alert.description,
    });
  }
}

// ============================================
// STARVATION & BOTTLENECK DETECTION
// ============================================

function detectStarvedAgents(
  activityByAgent: Record<string, number>,
  enabledAgents: string[]
): string[] {
  return enabledAgents.filter((agent) => (activityByAgent[agent] ?? 0) === 0);
}

function detectBottlenecks(
  pendingByAgent: Record<string, number>,
  inProgressByAgent: Record<string, number>
): Array<{ agent: string; pending: number; inProgress: number }> {
  const bottlenecks: Array<{
    agent: string;
    pending: number;
    inProgress: number;
  }> = [];
  const BOTTLENECK_THRESHOLD = 5;

  for (const [agent, pending] of Object.entries(pendingByAgent)) {
    const inProgress = inProgressByAgent[agent] ?? 0;
    if (pending >= BOTTLENECK_THRESHOLD && inProgress === 0) {
      bottlenecks.push({ agent, pending, inProgress });
    }
  }
  return bottlenecks;
}

// ============================================
// COORDINATION ACTION
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
      // Guard check: ensure budget/rate limits allow execution
      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: args.organizationId, agent: "system" }
      );
      if (!guardResult.allowed) {
        return null;
      }

      const ceoContext = await ctx.runQuery(
        internal.autopilot.agents.ceo.queries.getCEOContext,
        { organizationId: args.organizationId }
      );

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "system" }
      );

      const pendingTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        { organizationId: args.organizationId, status: "todo" }
      );
      const inProgressTasks = await ctx.runQuery(
        internal.autopilot.tasks.getTasksByOrg,
        { organizationId: args.organizationId, status: "in_progress" }
      );

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

Be specific and actionable. Only flag real issues, not hypotheticals.${agentKnowledge}`;

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

PENDING REVIEW ITEMS: ${ceoContext.pendingReviewCount}

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

      await applyPriorityOverrides(
        ctx,
        args.organizationId,
        coordination.priorityOverrides,
        priorityOverrideCandidates.validTaskIds
      );

      await createCoordinationAlerts(
        ctx,
        args.organizationId,
        coordination.proactiveAlerts
      );

      // Detect starved agents (0 work for 3+ days via 7d window)
      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: args.organizationId }
      );
      const starvedAgents = detectStarvedAgents(
        ceoContext.activityByAgent,
        enabledAgents
      );
      if (starvedAgents.length > 0) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: `Starvation detected: ${starvedAgents.join(", ")}`,
          content: `These agents have 0 activity in the last 7 days: ${starvedAgents.join(", ")}. They may need work assigned or may be stuck.`,
          sourceAgent: "system",
          needsReview: false,
          reviewType: "coordination_alert",
          tags: ["coordination", "starvation"],
        });
      }

      // Detect bottlenecks (many pending, 0 in-progress)
      const bottlenecks = detectBottlenecks(pendingByAgent, inProgressByAgent);
      for (const bottleneck of bottlenecks) {
        await ctx.runMutation(internal.autopilot.documents.createDocument, {
          organizationId: args.organizationId,
          type: "note",
          title: `Bottleneck: ${bottleneck.agent} has ${bottleneck.pending} pending tasks, 0 in progress`,
          content: `Agent "${bottleneck.agent}" has ${bottleneck.pending} tasks waiting but none being worked on. This agent may be blocked or needs attention.`,
          sourceAgent: "system",
          needsReview: false,
          reviewType: "coordination_alert",
          tags: ["coordination", "bottleneck"],
        });
      }

      const blockedAgents = coordination.agentAssessments.filter(
        (a) => a.status === "blocked" || a.status === "needs_attention"
      );

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "system",
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
        agent: "system",
        level: "error",
        message: `CEO coordination failed: ${errorMessage}`,
      });

      return null;
    }
  },
});
