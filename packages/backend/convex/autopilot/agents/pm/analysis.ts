/**
 * PM analysis action — reads feedback, agent notes, knowledge base, and existing tasks,
 * then generates prioritized autopilot tasks via AI.
 * Writes product notes about findings for other agents to consume.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { MODELS } from "../models";
import { buildAgentPrompt, PM_SYSTEM_PROMPT } from "../prompts";
import { generateObjectWithFallback } from "../shared";

// ============================================
// SCHEMA
// ============================================

const VALID_AGENTS = [
  "pm",
  "cto",
  "dev",
  "security",
  "architect",
  "growth",
  "support",
  "docs",
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

const initiativeBootstrapSchema = z.object({
  initiatives: z.array(
    z.object({
      title: z.string().describe("Initiative/epic title"),
      description: z.string().describe("What this initiative aims to achieve"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Priority level"),
      successMetrics: z.string().describe("How to measure success"),
    })
  ),
});

const PM_MODELS = [MODELS.FREE, MODELS.FAST] as const;

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
      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: args.organizationId }
      );

      const assignableAgents = enabledAgents.filter((a: string) => a !== "pm");

      if (assignableAgents.length === 0) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
        internal.autopilot.notes.getRecentNotes,
        { organizationId: args.organizationId }
      );

      const taskCapUsage = await ctx.runQuery(
        internal.autopilot.config.getTaskCapUsage,
        { organizationId: args.organizationId }
      );

      const agentKnowledge = await ctx.runQuery(
        internal.autopilot.agent_context.loadAgentContext,
        { organizationId: args.organizationId, agent: "pm" }
      );

      // Early exit: skip LLM call entirely if task caps are full
      if (taskCapUsage.totalPending >= taskCapUsage.totalCap) {
        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          agent: "pm",
          level: "info",
          message: `PM analysis skipped — task pipeline full (${taskCapUsage.totalPending}/${taskCapUsage.totalCap}). Waiting for existing tasks to complete.`,
        });
        return null;
      }

      // Mark notes as triaged so they don't re-trigger PM wake
      for (const note of recentNotes) {
        if (note.status === "new") {
          await ctx.runMutation(internal.autopilot.notes.triageNote, {
            noteId: note._id,
            status: "triaged",
          });
        }
      }

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
            category: string;
            sourceAgent: string;
            title: string;
            description: string;
            priority: string;
          }) =>
            `- [${n.category}/${n.sourceAgent}] ${n.title} (${n.priority}): ${n.description}`
        )
        .join("\n");

      const systemPrompt = buildAgentPrompt(
        PM_SYSTEM_PROMPT,
        await ctx.runQuery(
          internal.autopilot.feedback.buildFeedbackPromptContext,
          { organizationId: args.organizationId, agent: "pm" }
        ),
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

If no feedback or notes are available, use the knowledge base and roadmap context to create stories from planned initiatives. Never return empty results — always find work.

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
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: args.organizationId,
            agent: "pm",
            level: "info",
            message: `Skipped duplicate task: "${task.title}"`,
            details: `Similar task exists: "${existingTask.title}"`,
          });
          continue;
        }

        const taskId = await ctx.runMutation(
          internal.autopilot.tasks.createTask,
          {
            organizationId: args.organizationId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            assignedAgent: task.assignedAgent,
            origin: "pm_analysis",
            autonomyLevel: "review_required",
            acceptanceCriteria: task.acceptanceCriteria,
          }
        );

        if (!taskId) {
          continue;
        }

        createdCount++;

        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: args.organizationId,
        agent: "pm",
        level: "success",
        message: "PM analysis complete",
        details: `Created ${createdCount} tasks | Skipped ${pmOutput.skippedCount} items | Summary: ${pmOutput.summary}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
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

// ============================================
// INITIATIVE BOOTSTRAPPING
// ============================================

/**
 * Create initiatives if none exist yet.
 * Reads knowledge base (product roadmap, goals) and generates 2-3
 * initial initiatives so the Roadmap page has content.
 */
const bootstrapInitiativesIfNeeded = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
  },
  organizationId: Id<"organizations">,
  agentKnowledge?: string
): Promise<void> => {
  const existingInitiatives = await ctx.runQuery(
    internal.autopilot.initiatives.getInitiativesByOrg,
    { organizationId }
  );

  if (existingInitiatives.length > 0) {
    return;
  }

  try {
    const systemPrompt = buildAgentPrompt(
      PM_SYSTEM_PROMPT,
      "",
      "",
      agentKnowledge
    );

    const result = await generateObjectWithFallback({
      models: PM_MODELS,
      schema: initiativeBootstrapSchema,
      systemPrompt,
      prompt: `Based on the product knowledge base, create 2-3 strategic initiatives (epics) for the product roadmap.

Each initiative should be a major product theme that can contain multiple user stories and tasks.

Examples of good initiatives:
- "Improve Onboarding Experience" — reduce time-to-value for new users
- "Enterprise Features" — add SSO, audit logs, team management
- "Performance & Reliability" — reduce load times, improve uptime

Base your initiatives on context from the knowledge base. If no context is available, create sensible defaults for a SaaS product.`,
    });

    for (const initiative of result.initiatives) {
      await ctx.runMutation(internal.autopilot.initiatives.createInitiative, {
        organizationId,
        title: initiative.title,
        description: initiative.description,
        priority: initiative.priority,
        successMetrics: initiative.successMetrics,
        createdBy: "pm",
      });
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "pm",
      level: "success",
      message: `Bootstrapped ${result.initiatives.length} roadmap initiatives`,
      details: result.initiatives.map((i) => i.title).join(", "),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId,
      agent: "pm",
      level: "warning",
      message: `Failed to bootstrap initiatives: ${msg}`,
    });
  }
};
