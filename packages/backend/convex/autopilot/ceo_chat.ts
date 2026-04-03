/**
 * CEO Chat — persistent thread-based conversation with the CEO Agent.
 *
 * Each organization has one CEO chat thread stored on its autopilotConfig.
 * The CEO agent receives full product context (tasks, feedback, activity)
 * with each response, enabling it to act as a strategic advisor.
 */

import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { internalAction, mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { ceoAgent } from "./agents/ceo";

// ============================================
// QUERIES
// ============================================

/**
 * Get the CEO chat thread ID for an organization.
 * Returns null if no thread exists yet.
 */
export const getThread = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config?.ceoChatThreadId ?? null;
  },
});

/**
 * List messages in the CEO chat thread with real-time streaming support.
 */
export const listMessages = query({
  args: {
    threadId: v.string(),
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Get or create a CEO chat thread for an organization.
 * Creates the thread and stores its ID on the autopilotConfig.
 */
export const getOrCreateThread = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (config?.ceoChatThreadId) {
      return config.ceoChatThreadId;
    }

    const threadId = await createThread(ctx, components.agent, {});

    if (config) {
      await ctx.db.patch(config._id, {
        ceoChatThreadId: threadId,
        updatedAt: Date.now(),
      });
    }

    return threadId;
  },
});

/**
 * Send a message to the CEO chat and trigger an AI response.
 * The CEO agent receives org context to provide informed answers.
 */
export const sendMessage = mutation({
  args: {
    organizationId: v.id("organizations"),
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: args.prompt,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.ceo_chat.generateCEOResponseAsync,
      {
        threadId: args.threadId,
        promptMessageId: messageId,
        organizationId: args.organizationId,
      }
    );

    return messageId;
  },
});

// ============================================
// INTERNAL ACTIONS
// ============================================

/**
 * Generate a CEO response with full product context injected.
 * Uses the CEO agent with streaming for real-time message delivery.
 */
export const generateCEOResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ceoContext = await ctx.runQuery(
      internal.autopilot.agents.ceo.getCEOContext,
      { organizationId: args.organizationId }
    );

    const contextMessage = `[PRODUCT CONTEXT — updated in real time]
Tasks: ${ceoContext.taskStats.total} total (${ceoContext.taskStats.pending} pending, ${ceoContext.taskStats.inProgress} in progress, ${ceoContext.taskStats.completed} completed)
Priority breakdown: Critical (${ceoContext.taskStats.byPriority.critical}), High (${ceoContext.taskStats.byPriority.high}), Medium (${ceoContext.taskStats.byPriority.medium}), Low (${ceoContext.taskStats.byPriority.low})
Recent activity: ${ceoContext.recentActivityCount} actions in last 7 days
Feedback: ${ceoContext.feedbackStats.total} active items
Inbox: ${ceoContext.pendingInboxCount} pending items`;

    await ceoAgent.streamText(
      ctx,
      { threadId: args.threadId },
      {
        promptMessageId: args.promptMessageId,
        system: contextMessage,
      },
      { saveStreamDeltas: true }
    );

    return null;
  },
});
