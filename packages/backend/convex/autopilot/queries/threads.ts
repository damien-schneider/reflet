/**
 * Agent thread and message queries.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  agentThreadRole,
  agentWorkStreamRecord,
  assignedAgent,
} from "../schema/validators";
import { requireOrgMembership } from "./auth";

export const listAgentThreads = query({
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
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const getThreadMessages = query({
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
    const user = await getAuthUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return [];
    }

    await requireOrgMembership(ctx, thread.organizationId, user._id);

    return ctx.db
      .query("autopilotAgentMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(args.limit ?? 100);
  },
});

export const getLatestAgentWorkStream = query({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
  },
  returns: v.union(agentWorkStreamRecord, v.null()),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return await ctx.db
      .query("autopilotAgentWorkStreams")
      .withIndex("by_org_agent_updated", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .order("desc")
      .first();
  },
});

export const listLatestAgentWorkStreams = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(agentWorkStreamRecord),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    const rows = await ctx.db
      .query("autopilotAgentWorkStreams")
      .withIndex("by_org_updated", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    const latestByAgent = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByAgent.has(row.agent)) {
        latestByAgent.set(row.agent, row);
      }
    }

    return [...latestByAgent.values()];
  },
});
