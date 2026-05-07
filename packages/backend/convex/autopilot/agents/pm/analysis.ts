/**
 * PM analysis action — reads feedback, agent notes, knowledge base, and existing tasks,
 * then generates prioritized autopilot tasks via AI.
 * Writes product notes about findings for other agents to consume.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { QUALITY_MODELS } from "../models";
import { buildAgentPrompt, PM_SYSTEM_PROMPT } from "../prompts";
import {
  generateObjectWithFallback,
  getUsageTracker,
  resetUsageTracker,
} from "../shared_generation";
import { bootstrapInitiativesIfNeeded } from "./initiatives";

// ============================================
// SCHEMA
// ============================================

const VALID_AGENTS = [
  "pm",
  "cto",
  "dev",
  "growth",
  "support",
  "sales",
] as const;

export const pmAnalysisSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().describe("Short, actionable task title"),
      description: z
        .string()
        .describe("Detailed description of what needs to be done"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Task priority level"),
      assignedAgent: z
        .enum(VALID_AGENTS)
        .describe(
          "Agent responsible for this task — must be from the enabled agents list"
        ),
      acceptanceCriteria: z
        .array(z.string())
        .describe("Clear acceptance criteria for task completion"),
      reasoning: z
        .string()
        .describe("Why this task was created and its priority"),
    })
  ),
  summary: z.string().describe("Brief summary of the analysis performed"),
  skippedCount: z
    .number()
    .describe("Number of items that didn't warrant tasks"),
});

const PM_MODELS = QUALITY_MODELS;
const PM_ASSIGNMENT_BLOCKLIST = new Set(["pm", "dev"]);

export function getPMAssignableAgents(enabledAgents: readonly string[]) {
  return enabledAgents.filter((agent) => !PM_ASSIGNMENT_BLOCKLIST.has(agent));
}

// ============================================
// ACTION
// ============================================

/**
 * Main PM analysis action.
 * Reads feedback, agent notes, knowledge base, and existing tasks,
 * then generates and creates prioritized autopilot tasks.
 * Creates product notes about findings for other agents.
 */
export const runPMAnalysis = internalAction({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Guard check: ensure budget/rate limits allow execution
      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: args.organizationId, agent: "pm" }
      );
      if (!guardResult.allowed) {
        return null;
      }

      resetUsageTracker();

      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: args.organizationId }
      );

      const assignableAgents = getPMAssignableAgents(enabledAgents);

      if (assignableAgents.length === 0) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          agent: "pm",
          level: "warning",
          message: "PM analysis skipped — no assignable agents are enabled",
        });
        return null;
      }

      const feedbackItems = await ctx.runQuery(
        internal.autopilot.agents.pm.queries.getFeedbackForOrganization,
        { organizationId: args.organizationId }
      );

      const existingTasks = await ctx.runQuery(
        internal.autopilot.agents.pm.queries.getExistingTasksForOrganization,
        { organizationId: args.organizationId }
      );

      const recentNotes = await ctx.runQuery(
        internal.autopilot.documents.getDocumentsByOrg,
        { organizationId: args.organizationId, type: "note" }
      );

      const taskCapUsage = await ctx.runQuery(
        internal.autopilot.config_task_caps.getTaskCapUsage,
        { organizationId: args.organizationId }
      );

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "pm" }
      );

      // Early exit: skip LLM call entirely if task caps are full
      if (taskCapUsage.totalPending >= taskCapUsage.totalCap) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          agent: "pm",
          level: "info",
          message: `PM analysis skipped — task pipeline full (${taskCapUsage.totalPending}/${taskCapUsage.totalCap}). Waiting for existing tasks to complete.`,
        });
        return null;
      }

      // Mark note documents as reviewed so they don't re-trigger PM wake
      for (const note of recentNotes) {
        if (note.status === "draft") {
          await ctx.runMutation(internal.autopilot.documents.updateDocument, {
            documentId: note._id,
            status: "published",
          });
        }
      }

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "action",
        message: "Starting PM analysis",
        details: `Feedback items: ${feedbackItems.length} | Notes: ${recentNotes.length} | Existing tasks: ${existingTasks.length} | Assignable agents: ${assignableAgents.join(", ")}`,
      });

      const feedbackContext = feedbackItems
        .map(
          (f: {
            title: string;
            voteCount: number;
            aiPriority?: string;
            description: string;
          }) =>
            `- "${f.title}" (${f.voteCount} votes, AI priority: ${f.aiPriority ?? "unassessed"}) - ${f.description}`
        )
        .join("\n");

      const existingTasksContext = existingTasks
        .map(
          (t: { title: string; status: string }) =>
            `- "${t.title}" (status: ${t.status})`
        )
        .join("\n");

      const notesContext = recentNotes
        .map(
          (n: {
            type: string;
            sourceAgent?: string;
            title: string;
            content: string;
          }) =>
            `- [${n.type}/${n.sourceAgent ?? "system"}] ${n.title}: ${n.content.slice(0, 200)}`
        )
        .join("\n");

      const systemPrompt = buildAgentPrompt(
        PM_SYSTEM_PROMPT,
        "",
        "",
        agentKnowledge
      );

      const userPrompt = `Analyze feedback, agent notes, and knowledge base to create actionable tasks.

ENABLED AGENTS (you MUST only assign tasks to these agents):
${assignableAgents.join(", ")}

TASK CAPS:
- Max pending per agent: ${taskCapUsage.perAgentCap}
- Max total pending: ${taskCapUsage.totalCap} (currently ${taskCapUsage.totalPending}/${taskCapUsage.totalCap})
- Current per-agent usage: ${taskCapUsage.agentUsage.map((a: { agent: string; pending: number; cap: number }) => `${a.agent} (${a.pending}/${a.cap}${a.pending >= a.cap ? " FULL" : ""})`).join(", ")}
- Only create tasks for agents with available capacity.
- Prioritize agents with 0 pending tasks first.

FEEDBACK ITEMS:
${feedbackContext || "(none)"}

EXISTING TASKS (to avoid duplicating):
${existingTasksContext || "(none)"}

AGENT NOTES (cross-domain context from all agents):
${notesContext || "(none)"}

If no feedback, notes, or credible roadmap gaps are available, return zero tasks and explain why in the summary. Do not invent work to stay busy.

ROUTING RULE:
- Technical implementation, architecture, and code-change work MUST go to CTO.
- Dev receives executable subtasks only from CTO specifications; do not assign PM-created tasks directly to Dev.

Generate tasks that address the highest-priority feedback and note patterns.
For each task, provide:
- A clear title and description
- Priority (critical/high/medium/low)
- Assigned agent (MUST be one of: ${assignableAgents.join(", ")})
- 2-3 acceptance criteria
- Reasoning for the task and priority`;

      const pmOutput = await generateObjectWithFallback({
        models: PM_MODELS,
        schema: pmAnalysisSchema,
        systemPrompt,
        prompt: userPrompt,
      });

      const assignableSet = new Set(assignableAgents);
      let createdCount = 0;
      for (const task of pmOutput.tasks) {
        if (!assignableSet.has(task.assignedAgent)) {
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: args.organizationId,
            agent: "pm",
            level: "warning",
            message: `Skipped task "${task.title}" — assigned to disabled agent "${task.assignedAgent}"`,
          });
          continue;
        }

        const existingTask = existingTasks.find(
          (t: { title: string; status: string }) =>
            t.title.toLowerCase() === task.title.toLowerCase() ||
            t.title.includes(task.title.slice(0, 10)) ||
            task.title.includes(t.title.slice(0, 10))
        );

        if (existingTask) {
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: args.organizationId,
            agent: "pm",
            level: "info",
            message: `Skipped duplicate task: "${task.title}"`,
            details: `Similar task exists: "${existingTask.title}"`,
          });
          continue;
        }

        const taskId = await ctx.runMutation(
          internal.autopilot.task_mutations.createTask,
          {
            organizationId: args.organizationId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            assignedAgent: task.assignedAgent,
            createdBy: "pm_analysis",
            acceptanceCriteria: task.acceptanceCriteria,
          }
        );

        if (!taskId) {
          continue;
        }

        createdCount++;

        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: args.organizationId,
          taskId,
          agent: "pm",
          targetAgent: task.assignedAgent,
          level: "success",
          message: `New task assigned: ${task.title}`,
          details: `Priority: ${task.priority} | Agent: ${task.assignedAgent} | Reasoning: ${task.reasoning}`,
        });
      }

      // PM does NOT create notes about its own analysis — this would
      // trigger a feedback loop (heartbeat sees new note → wakes PM → repeat).
      // PM's output is tasks, not notes. Activity log captures the summary.

      // Bootstrap initiatives if none exist — roadmap page shows initiatives,
      // so PM must create them from knowledge context on first run.
      await bootstrapInitiativesIfNeeded(
        ctx,
        args.organizationId,
        agentKnowledge
      );

      const usage = getUsageTracker();
      if (usage.estimatedCostUsd > 0) {
        await ctx.runMutation(internal.autopilot.cost_guard.recordCost, {
          organizationId: args.organizationId,
          costUsd: usage.estimatedCostUsd,
        });
      }
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "success",
        message: "PM analysis complete",
        details: `Created ${createdCount} tasks | Skipped ${pmOutput.skippedCount} items | Summary: ${pmOutput.summary} | LLM: ${usage.calls} calls, ~$${usage.estimatedCostUsd.toFixed(4)}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "error",
        message: "PM analysis failed",
        details: errorMessage,
      });

      throw new Error(`PM analysis failed: ${errorMessage}`);
    }
  },
});
