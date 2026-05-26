/**
 * CEO Chat — persistent thread-based conversation with the CEO coordination skill.
 *
 * Each organization has one CEO chat thread stored on its autopilotConfig.
 * The CEO skill receives full product context (tasks, feedback, activity)
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
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalAction, mutation, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { requireAutopilotAccess, requireOrgAdmin } from "./mutations/auth";
import { requireOrgMembership } from "./queries/auth";
import { ceoSkillRuntime } from "./role_skills/ceo/runtime";
import { makeCeoToolsForOrg } from "./role_skills/ceo_tools";

interface ChatConfigOptions {
  organizationId: Id<"organizations">;
  userId: string;
}

type ChatThreadOptions = ChatConfigOptions & {
  threadId: string;
};

const getAuthorizedConfig = async (
  ctx: { db: QueryCtx["db"] },
  options: ChatConfigOptions
): Promise<Doc<"autopilotConfig"> | null> => {
  await requireOrgMembership(ctx, options.organizationId, options.userId);

  return await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", options.organizationId)
    )
    .unique();
};

const requireAuthorizedConfig = async (
  ctx: { db: QueryCtx["db"] },
  options: ChatConfigOptions
): Promise<Doc<"autopilotConfig">> => {
  const config = await getAuthorizedConfig(ctx, options);
  if (!config) {
    throw new Error("Autopilot is not configured for this organization");
  }
  return config;
};

const requireOwnedThread = async (
  ctx: { db: QueryCtx["db"] },
  options: ChatThreadOptions
) => {
  const config = await requireAuthorizedConfig(ctx, options);
  if (config.ceoChatThreadId !== options.threadId) {
    throw new Error("CEO chat thread does not belong to this organization");
  }
  return config;
};

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
    const config = await getAuthorizedConfig(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
    });

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
    await requireOwnedThread(ctx, {
      organizationId: args.organizationId,
      threadId: args.threadId,
      userId: user._id,
    });

    const paginated = await listUIMessages(ctx, components.aiRuntime, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.aiRuntime, {
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
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);
    const config = await requireAuthorizedConfig(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
    });

    if (config.ceoChatThreadId) {
      return config.ceoChatThreadId;
    }

    const threadId = await createThread(ctx, components.aiRuntime, {});

    await ctx.db.patch(config._id, {
      ceoChatThreadId: threadId,
      updatedAt: Date.now(),
    });

    return threadId;
  },
});

/**
 * Send a message to the CEO chat and trigger an AI response.
 * The CEO skill receives org context to provide informed answers.
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
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);
    await requireOwnedThread(ctx, {
      organizationId: args.organizationId,
      threadId: args.threadId,
      userId: user._id,
    });

    const { messageId } = await saveMessage(ctx, components.aiRuntime, {
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
 * Uses the CEO coordination skill with streaming for real-time message delivery.
 */
export const generateCEOResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await ctx.runQuery(
      internal.autopilot.billing_gate.checkAccess,
      {
        organizationId: args.organizationId,
      }
    );
    if (!access.allowed) {
      return null;
    }

    // Get aggregate context
    const ceoContext = await ctx.runQuery(
      internal.autopilot.role_skills.ceo.queries.getCEOContext,
      { organizationId: args.organizationId }
    );

    // Get detailed context with task titles, role states, errors, inbox items
    const detailed = await ctx.runQuery(
      internal.autopilot.role_skills.ceo.queries.getDetailedCEOContext,
      { organizationId: args.organizationId }
    );

    const taskLines = detailed.taskSummaries
      .map(
        (t: {
          priority: string;
          role?: string;
          status: string;
          title: string;
        }) =>
          `  - [${t.status}] ${t.title} (${t.priority}, ${t.role ?? "unassigned"})`
      )
      .join("\n");

    const roleLines = Object.entries(detailed.roleStates)
      .map(([role, enabled]) => `  - ${role}: ${enabled ? "ON" : "OFF"}`)
      .join("\n");

    const errorLines =
      detailed.recentErrors.length > 0
        ? detailed.recentErrors
            .map((e) => `  - ${e.role}: ${e.message} (${e.ago}m ago)`)
            .join("\n")
        : "  None";

    const reviewLines =
      detailed.reviewSummaries.length > 0
        ? detailed.reviewSummaries
            .map(
              (i: {
                id: string;
                priority: string;
                source: string;
                title: string;
                type: string;
              }) =>
                `  - [${i.source}:${i.id}] ${i.title} (${i.type}, ${i.priority})`
            )
            .join("\n")
        : "  None";

    const contextMessage = `[PRODUCT CONTEXT — updated in real time]
Autonomy mode: ${detailed.autonomyMode}

TASK OVERVIEW:
Total: ${ceoContext.taskStats.total} | Todo: ${ceoContext.taskStats.todo} | In Progress: ${ceoContext.taskStats.inProgress} | Done: ${ceoContext.taskStats.done} | Cancelled: ${ceoContext.taskStats.cancelled}
Priority: Critical (${ceoContext.taskStats.byPriority.critical}), High (${ceoContext.taskStats.byPriority.high}), Medium (${ceoContext.taskStats.byPriority.medium}), Low (${ceoContext.taskStats.byPriority.low})

RECENT TASKS:
${taskLines || "  None"}

ROLE-SKILL STATES:
${roleLines}

RECENT ERRORS:
${errorLines}

PENDING REVIEW (${ceoContext.pendingReviewCount} total):
${reviewLines}

ACTIVITY: ${ceoContext.recentActivityCount} actions in last 7 days
FEEDBACK: ${ceoContext.feedbackStats.total} active items

You have tools available to create tasks, check role-skill statuses, view tasks, trigger PM analysis, and view recent activity. Use them when the user asks you to take action.`;

    await ceoSkillRuntime.streamText(
      ctx,
      { threadId: args.threadId },
      {
        promptMessageId: args.promptMessageId,
        system: contextMessage,
        tools: makeCeoToolsForOrg(args.organizationId),
      },
      { saveStreamDeltas: true }
    );

    return null;
  },
});
