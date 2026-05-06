/**
 * Per-agent detail queries — activity log and thread info.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { activityLogLevel, assignedAgent } from "../schema/validators";
import { requireOrgMembership } from "./auth";

const DEFAULT_ACTIVITY_LIMIT = 100;

/**
 * List activity log entries filtered by a specific agent.
 * Uses the `by_org_created` index and filters in-memory by agent.
 */
export const listAgentActivity = query({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    level: v.optional(activityLogLevel),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotActivityLog"),
      _creationTime: v.number(),
      agent: assignedAgent,
      targetAgent: v.optional(assignedAgent),
      level: activityLogLevel,
      message: v.string(),
      details: v.optional(v.string()),
      action: v.optional(v.string()),
      entityType: v.optional(
        v.union(
          v.literal("work_item"),
          v.literal("document"),
          v.literal("knowledge_doc"),
          v.literal("run"),
          v.literal("lead"),
          v.literal("competitor")
        )
      ),
      entityId: v.optional(v.string()),
      createdAt: v.number(),
      workItemId: v.optional(v.id("autopilotWorkItems")),
      runId: v.optional(v.id("autopilotRuns")),
      organizationId: v.id("organizations"),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const limit = args.limit ?? DEFAULT_ACTIVITY_LIMIT;

    const results = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .filter((q) => {
        const agentMatch = q.eq(q.field("agent"), args.agent);
        if (args.level) {
          return q.and(agentMatch, q.eq(q.field("level"), args.level));
        }
        return agentMatch;
      })
      .take(limit);

    return results;
  },
});

/**
 * Get the conversation thread for a specific agent.
 * Returns the thread doc or null if no thread exists.
 */
export const getAgentThread = query({
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
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const thread = await ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .first();

    return thread;
  },
});
