/**
 * Concurrent Context Gatherer — cross-agent knowledge sharing.
 *
 * When an agent is working on a topic, it can query what other agents
 * know about that topic. This enables informed decision-making across
 * the entire agent team.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Gather context from all agents about a specific topic.
 *
 * Searches recent activity logs, inbox items, tasks, and intelligence signals
 * for mentions of the topic keywords. Returns a per-agent summary.
 */
export const gatherConcurrentContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    keywords: v.array(v.string()),
    excludeAgent: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      relevantFindings: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedKeywords = args.keywords.map((k) => k.toLowerCase());

    const matchesKeyword = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      return normalizedKeywords.some((kw) => lowerText.includes(kw));
    };

    // 1. Search recent activity log (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activities = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentActivities = activities.filter(
      (a) => a.createdAt >= sevenDaysAgo
    );

    // 2. Search pending/recent inbox items
    const inboxItems = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const recentInbox = inboxItems.filter(
      (item) => item.createdAt >= sevenDaysAgo
    );

    // 3. Search active tasks
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeTasks = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

    // Build agent context map
    const agentContextMap = new Map<string, string[]>();

    const addFinding = (agent: string, finding: string) => {
      if (agent === args.excludeAgent) {
        return;
      }
      const existing = agentContextMap.get(agent) ?? [];
      // Limit to 5 findings per agent
      if (existing.length < 5) {
        existing.push(finding);
      }
      agentContextMap.set(agent, existing);
    };

    // Match activities
    for (const activity of recentActivities) {
      if (matchesKeyword(activity.message)) {
        addFinding(activity.agent, activity.message);
      }
    }

    // Match inbox items
    for (const item of recentInbox) {
      const searchable = `${item.title} ${item.summary} ${item.content ?? ""}`;
      if (matchesKeyword(searchable)) {
        addFinding(item.sourceAgent, `[Inbox] ${item.title}: ${item.summary}`);
      }
    }

    // Match tasks
    for (const task of activeTasks) {
      const searchable = `${task.title} ${task.description}`;
      if (matchesKeyword(searchable)) {
        addFinding(task.assignedAgent, `[Task:${task.status}] ${task.title}`);
      }
    }

    // Convert map to array
    const results: Array<{
      agent: string;
      relevantFindings: string[];
    }> = [];
    for (const [agent, findings] of agentContextMap) {
      results.push({ agent, relevantFindings: findings });
    }

    return results;
  },
});

/**
 * Get a brief status summary for ALL agents.
 * Used by CEO for coordination overview.
 */
export const getAllAgentStatus = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      agent: v.string(),
      enabled: v.boolean(),
      recentActivityCount: v.number(),
      pendingInboxCount: v.number(),
      activeTaskCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return [];
    }

    const agents = ["pm", "cto", "dev", "growth", "support", "sales"] as const;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const activities = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const inboxItems = await ctx.db
      .query("autopilotInboxItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return agents.map((agent) => {
      const agentToggleKey = `${agent}Enabled` as const;
      const enabled =
        ((config as Record<string, unknown>)[agentToggleKey] as
          | boolean
          | undefined) ?? true;

      const recentActivityCount = activities.filter(
        (a) => a.agent === agent && a.createdAt >= oneHourAgo
      ).length;

      const pendingInboxCount = inboxItems.filter(
        (item) => item.sourceAgent === agent
      ).length;

      const activeTaskCount = tasks.filter(
        (t) =>
          t.assignedAgent === agent &&
          t.status !== "completed" &&
          t.status !== "cancelled"
      ).length;

      return {
        agent,
        enabled,
        recentActivityCount,
        pendingInboxCount,
        activeTaskCount,
      };
    });
  },
});
