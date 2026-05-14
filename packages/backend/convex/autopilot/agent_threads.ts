/**
 * Agent thread management — per-agent conversational threads.
 *
 * Each agent has its own chat that users can interact with directly.
 * The thread uses the same communication pattern as the CEO chat
 * but each agent has its own context and tool access.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import type { GenerationStreamCallbacks } from "./agents/shared_generation";
import {
  agentThreadRole,
  agentWorkStreamRecord,
  assignedAgent,
} from "./schema/validators";

type WorkStreamAgent =
  | "pm"
  | "cto"
  | "growth"
  | "orchestrator"
  | "system"
  | "support"
  | "sales"
  | "ceo"
  | "validator";

interface WorkStreamOptions {
  agent: WorkStreamAgent;
  organizationId: Id<"organizations">;
  title: string;
  workItemId?: Id<"autopilotWorkItems">;
}

export const createWorkStreamCallbacks = async (
  ctx: ActionCtx,
  options: WorkStreamOptions
): Promise<GenerationStreamCallbacks> => {
  const streamId = options.workItemId
    ? await ctx.runMutation(internal.autopilot.agent_threads.startWorkStream, {
        organizationId: options.organizationId,
        agent: options.agent,
        title: options.title,
        workItemId: options.workItemId,
      })
    : await ctx.runMutation(internal.autopilot.agent_threads.startWorkStream, {
        organizationId: options.organizationId,
        agent: options.agent,
        title: options.title,
      });

  return {
    onError: (error: string) =>
      ctx.runMutation(internal.autopilot.agent_threads.failWorkStream, {
        streamId,
        error,
      }),
    onFinish: (content: string) =>
      ctx.runMutation(internal.autopilot.agent_threads.finishWorkStream, {
        streamId,
        content,
      }),
    onModelStart: (model: string) =>
      ctx.runMutation(internal.autopilot.agent_threads.updateWorkStream, {
        streamId,
        content: "",
        model,
      }),
    onUpdate: (content: string) =>
      ctx.runMutation(internal.autopilot.agent_threads.updateWorkStream, {
        streamId,
        content,
      }),
  };
};

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

export const startWorkStream = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    title: v.string(),
    workItemId: v.optional(v.id("autopilotWorkItems")),
  },
  returns: v.id("autopilotAgentWorkStreams"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const activeStreams = await ctx.db
      .query("autopilotAgentWorkStreams")
      .withIndex("by_org_agent_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("agent", args.agent)
          .eq("status", "streaming")
      )
      .collect();

    for (const stream of activeStreams) {
      await ctx.db.patch(stream._id, {
        status: "completed",
        updatedAt: now,
        completedAt: now,
      });
    }

    return ctx.db.insert("autopilotAgentWorkStreams", {
      organizationId: args.organizationId,
      agent: args.agent,
      workItemId: args.workItemId,
      title: args.title,
      status: "streaming",
      content: "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateWorkStream = internalMutation({
  args: {
    streamId: v.id("autopilotAgentWorkStreams"),
    content: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error(`Agent work stream not found: ${args.streamId}`);
    }

    if (args.model) {
      await ctx.db.patch(args.streamId, {
        content: args.content,
        model: args.model,
        status: "streaming",
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.patch(args.streamId, {
      content: args.content,
      status: "streaming",
      updatedAt: now,
    });
    return null;
  },
});

export const finishWorkStream = internalMutation({
  args: {
    streamId: v.id("autopilotAgentWorkStreams"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error(`Agent work stream not found: ${args.streamId}`);
    }

    const now = Date.now();
    await ctx.db.patch(args.streamId, {
      content: args.content,
      status: "completed",
      updatedAt: now,
      completedAt: now,
    });
    return null;
  },
});

export const failWorkStream = internalMutation({
  args: {
    streamId: v.id("autopilotAgentWorkStreams"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error(`Agent work stream not found: ${args.streamId}`);
    }

    const now = Date.now();
    await ctx.db.patch(args.streamId, {
      status: "failed",
      error: args.error,
      updatedAt: now,
      completedAt: now,
    });
    return null;
  },
});

export const getLatestWorkStream = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.union(agentWorkStreamRecord, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotAgentWorkStreams")
      .withIndex("by_org_agent_updated", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .order("desc")
      .first();
  },
});
