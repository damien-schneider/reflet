/**
 * CEO Agent Tools — enables the CEO to take real actions, not just talk.
 *
 * Factory function creates org-scoped tools that can call Convex
 * mutations and queries via the action context provided by @convex-dev/agent.
 */

import { createTool, type ToolCtx } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { DataModel, Id } from "../../_generated/dataModel";

type CeoCtx = ToolCtx<DataModel>;

/**
 * Create org-scoped CEO tools. The organizationId is captured in the
 * closure so tools don't need it from the LLM.
 */
export const makeCeoToolsForOrg = (organizationId: Id<"organizations">) => ({
  createTask: createTool<
    {
      title: string;
      description: string;
      priority: "critical" | "high" | "medium" | "low";
      assignedAgent: "pm" | "cto" | "dev" | "growth" | "support" | "sales";
    },
    string,
    CeoCtx
  >({
    description:
      "Create a new autopilot task assigned to a specific agent. Use when the user asks to create work, fix something, or take action.",
    inputSchema: z.object({
      title: z.string().describe("Short, descriptive task title"),
      description: z
        .string()
        .describe("Detailed description of what needs to be done"),
      priority: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Task priority"),
      assignedAgent: z
        .enum(["pm", "cto", "dev", "growth", "support", "sales"])
        .describe("Agent to assign this task to"),
    }),
    execute: async (ctx, input) => {
      const taskId = await ctx.runMutation(
        internal.autopilot.task_mutations.createTask,
        {
          organizationId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          assignedAgent: input.assignedAgent,
          createdBy: "ceo_chat",
        }
      );
      return `Task created: "${input.title}" (${input.priority} priority, assigned to ${input.assignedAgent}). ID: ${taskId}`;
    },
  }),

  getAgentStatuses: createTool<Record<string, never>, string, CeoCtx>({
    description:
      "Get the current status of all autopilot agents: enabled/disabled, activity counts, pending tasks.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      const statuses = await ctx.runQuery(
        internal.autopilot.context.getAllAgentStatus,
        { organizationId }
      );
      const lines = statuses.map(
        (s: {
          agent: string;
          enabled: boolean;
          recentActivityCount: number;
          activeTaskCount: number;
          pendingInboxCount: number;
        }) =>
          `${s.agent}: ${s.enabled ? "enabled" : "disabled"} | ${s.recentActivityCount} recent | ${s.activeTaskCount} tasks | ${s.pendingInboxCount} inbox`
      );
      return `Agent Statuses:\n${lines.join("\n")}`;
    },
  }),

  getRecentTasks: createTool<{ status?: string }, string, CeoCtx>({
    description: "Get recent autopilot tasks, optionally filtered by status.",
    inputSchema: z.object({
      status: z
        .enum([
          "backlog",
          "todo",
          "in_progress",
          "in_review",
          "done",
          "cancelled",
        ])
        .optional()
        .describe("Filter by task status"),
    }),
    execute: async (ctx, input) => {
      const tasks = await ctx.runQuery(
        internal.autopilot.task_queries.getTasksByOrg,
        {
          organizationId,
          status: input.status as never,
        }
      );
      if (tasks.length === 0) {
        return input.status
          ? `No ${input.status} tasks found.`
          : "No tasks found.";
      }
      const lines = tasks
        .slice(0, 20)
        .map(
          (t: {
            status: string;
            title: string;
            priority: string;
            assignedAgent?: string;
          }) =>
            `- [${t.status}] ${t.title} (${t.priority}, ${t.assignedAgent ?? "unassigned"})`
        );
      return `Tasks (${tasks.length} total):\n${lines.join("\n")}`;
    },
  }),

  triggerPMAnalysis: createTool<Record<string, never>, string, CeoCtx>({
    description:
      "Trigger an immediate PM analysis to scan feedback and generate new tasks. Use when agents are idle or when tasks are needed.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      await ctx.runAction(internal.autopilot.agents.pm.analysis.runPMAnalysis, {
        organizationId,
      });
      return "PM analysis triggered. New tasks will be created based on current feedback and intelligence data.";
    },
  }),

  getRecentActivity: createTool<{ limit?: number }, string, CeoCtx>({
    description:
      "Get recent activity log entries showing what agents have been doing.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(15)
        .describe("Number of entries (default 15)"),
    }),
    execute: async (ctx, input) => {
      const activities = await ctx.runQuery(
        internal.autopilot.task_queries.getRecentActivity,
        { organizationId, limit: input.limit ?? 15 }
      );
      if (activities.length === 0) {
        return "No recent activity found.";
      }
      const lines = activities.map(
        (a: {
          level: string;
          agent: string;
          message: string;
          createdAt: number;
        }) => {
          const ago = Math.round((Date.now() - a.createdAt) / 60_000);
          return `[${a.level}] ${a.agent}: ${a.message} (${ago}m ago)`;
        }
      );
      return `Recent Activity:\n${lines.join("\n")}`;
    },
  }),

  approveInboxItem: createTool<
    {
      itemId: string;
      itemType: "work_item" | "document";
      decision: "approved" | "rejected";
    },
    string,
    CeoCtx
  >({
    description:
      "Approve or reject a pending review item (work item or document). Use when items need human decision.",
    inputSchema: z.object({
      itemId: z.string().describe("The work item or document ID to act on"),
      itemType: z
        .enum(["work_item", "document"])
        .describe("Whether this is a work item or document"),
      decision: z
        .enum(["approved", "rejected"])
        .describe("Approve or reject the item"),
    }),
    execute: async (ctx, input) => {
      if (input.itemType === "work_item") {
        const status =
          input.decision === "rejected" ? ("cancelled" as const) : undefined;
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: input.itemId as Id<"autopilotWorkItems">,
            status: status ?? "todo",
            needsReview: false,
            reviewType: undefined,
          }
        );
      } else {
        await ctx.runMutation(internal.autopilot.documents.updateDocument, {
          documentId: input.itemId as Id<"autopilotDocuments">,
          needsReview: false,
          reviewedAt: Date.now(),
          status: input.decision === "rejected" ? "archived" : undefined,
        });
      }
      return `Review item ${input.decision}.`;
    },
  }),

  toggleAgent: createTool<{ agent: string; enabled: boolean }, string, CeoCtx>({
    description: "Enable or disable a specific agent.",
    inputSchema: z.object({
      agent: z
        .enum(["pm", "cto", "dev", "growth", "support", "sales"])
        .describe("Agent to toggle"),
      enabled: z.boolean().describe("Enable (true) or disable (false)"),
    }),
    execute: async (ctx, input) => {
      const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
        organizationId,
      });
      if (!config) {
        return "Error: Autopilot not configured.";
      }
      const field = `${input.agent}Enabled`;
      await ctx.runMutation(internal.autopilot.config_mutations.updateConfig, {
        configId: config._id,
        [field]: input.enabled,
      });
      return `${input.agent} agent ${input.enabled ? "enabled" : "disabled"}.`;
    },
  }),

  setAutonomyMode: createTool<
    { mode: "supervised" | "full_auto" | "stopped" },
    string,
    CeoCtx
  >({
    description:
      "Change the autonomy mode. 'supervised' requires approval for external actions, 'full_auto' executes with delay, 'stopped' pauses everything.",
    inputSchema: z.object({
      mode: z
        .enum(["supervised", "full_auto", "stopped"])
        .describe("The autonomy mode to set"),
    }),
    execute: async (ctx, input) => {
      await ctx.runMutation(internal.autopilot.autonomy.setAutonomyMode, {
        organizationId,
        mode: input.mode,
      });
      return `Autonomy mode set to ${input.mode}.`;
    },
  }),

  getPendingInbox: createTool<Record<string, never>, string, CeoCtx>({
    description:
      "Get pending review items that need approval. Shows items waiting for human review.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      const detailed = await ctx.runQuery(
        internal.autopilot.agents.ceo.queries.getDetailedCEOContext,
        { organizationId }
      );
      if (detailed.reviewSummaries.length === 0) {
        return "No pending review items.";
      }
      const lines = detailed.reviewSummaries.map(
        (item: { title: string; type: string; priority: string }) =>
          `- [${item.priority}] ${item.title} (${item.type})`
      );
      return `Pending Review (${detailed.reviewSummaries.length}):\n${lines.join("\n")}`;
    },
  }),

  getCosts: createTool<Record<string, never>, string, CeoCtx>({
    description: "Get current cost usage, limits, and task quotas.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
        organizationId,
      });
      if (!config) {
        return "Autopilot not configured.";
      }
      const costLine = config.dailyCostCapUsd
        ? `$${config.costUsedTodayUsd ?? 0} / $${config.dailyCostCapUsd}`
        : `$${config.costUsedTodayUsd ?? 0} (no cap)`;
      return `Cost today: ${costLine} | Tasks: ${config.tasksUsedToday}/${config.maxTasksPerDay}`;
    },
  }),
});
