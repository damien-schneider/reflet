/**
 * Agent thread management — per-agent conversational threads.
 *
 * Each agent has its own chat that users can interact with directly.
 * The thread uses the same communication pattern as the CEO chat
 * but each agent has its own context and tool access.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { agentThreadRole, assignedAgent } from "./tableFields";

// ============================================
// QUERIES
// ============================================

/**
 * Get the thread for a specific agent in an organization.
 */
export const getAgentThread = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.union(
    v.object({
      _id: v.id("autopilotAgentThreads"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      agent: assignedAgent,
      threadId: v.string(),
      lastMessageAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .unique();
  },
});

/**
 * Get all agent threads for an organization.
 */
export const getAllAgentThreads = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotAgentThreads"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      agent: assignedAgent,
      threadId: v.string(),
      lastMessageAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get messages for a thread, most recent first.
 */
export const getThreadMessages = internalQuery({
  args: {
    threadId: v.id("autopilotAgentThreads"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotAgentMessages"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      threadId: v.id("autopilotAgentThreads"),
      role: agentThreadRole,
      content: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const DEFAULT_LIMIT = 50;
    const limit = args.limit ?? DEFAULT_LIMIT;
    const messages = await ctx.db
      .query("autopilotAgentMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(limit);

    // Return in chronological order
    return messages.reverse();
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create or get an agent thread for an organization.
 */
export const ensureAgentThread = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.id("autopilotAgentThreads"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return ctx.db.insert("autopilotAgentThreads", {
      organizationId: args.organizationId,
      agent: args.agent,
      threadId: `${args.agent}-${args.organizationId}-${now}`,
      createdAt: now,
    });
  },
});

/**
 * Add a message to an agent thread.
 */
export const addMessage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    threadId: v.id("autopilotAgentThreads"),
    role: agentThreadRole,
    content: v.string(),
  },
  returns: v.id("autopilotAgentMessages"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert("autopilotAgentMessages", {
      organizationId: args.organizationId,
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      createdAt: now,
    });

    // Update thread's lastMessageAt
    await ctx.db.patch(args.threadId, { lastMessageAt: now });

    return messageId;
  },
});

/**
 * Record agent metrics for a period.
 */
export const recordAgentMetrics = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    period: v.string(),
    tasksCompleted: v.number(),
    tasksFailed: v.number(),
    avgCompletionTimeMs: v.optional(v.number()),
    approvalRate: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  returns: v.id("autopilotAgentMetrics"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("autopilotAgentMetrics", {
      organizationId: args.organizationId,
      agent: args.agent,
      period: args.period,
      tasksCompleted: args.tasksCompleted,
      tasksFailed: args.tasksFailed,
      avgCompletionTimeMs: args.avgCompletionTimeMs,
      approvalRate: args.approvalRate,
      tokensUsed: args.tokensUsed,
      costUsd: args.costUsd,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get agent metrics for a specific agent.
 */
export const getAgentMetrics = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotAgentMetrics"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      agent: assignedAgent,
      period: v.string(),
      tasksCompleted: v.number(),
      tasksFailed: v.number(),
      avgCompletionTimeMs: v.optional(v.number()),
      approvalRate: v.optional(v.number()),
      tokensUsed: v.optional(v.number()),
      costUsd: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotAgentMetrics")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .order("desc")
      .take(10);
  },
});
