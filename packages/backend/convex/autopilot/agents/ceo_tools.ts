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
      assignedAgent:
        | "pm"
        | "cto"
        | "dev"
        | "security"
        | "architect"
        | "growth"
        | "support"
        | "analytics"
        | "docs"
        | "qa"
        | "ops"
        | "sales";
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
        .enum([
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
        ])
        .describe("Agent to assign this task to"),
    }),
    execute: async (ctx, input) => {
      const taskId = await ctx.runMutation(
        internal.autopilot.tasks.createTask,
        {
          organizationId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          assignedAgent: input.assignedAgent,
          origin: "user_created",
          autonomyLevel: "review_required",
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
          "pending",
          "in_progress",
          "completed",
          "failed",
          "cancelled",
          "paused",
        ])
        .optional()
        .describe("Filter by task status"),
    }),
    execute: async (ctx, input) => {
      const tasks = await ctx.runQuery(internal.autopilot.tasks.getTasksByOrg, {
        organizationId,
        status: input.status as never,
      });
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
            assignedAgent: string;
          }) => `- [${t.status}] ${t.title} (${t.priority}, ${t.assignedAgent})`
        );
      return `Tasks (${tasks.length} total):\n${lines.join("\n")}`;
    },
  }),

  triggerPMAnalysis: createTool<Record<string, never>, string, CeoCtx>({
    description:
      "Trigger an immediate PM analysis to scan feedback and generate new tasks. Use when agents are idle or when tasks are needed.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      await ctx.runAction(internal.autopilot.agents.pm.runPMAnalysis, {
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
        internal.autopilot.tasks.getRecentActivity,
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
});
