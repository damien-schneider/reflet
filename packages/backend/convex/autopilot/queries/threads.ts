/**
 * Agent thread and message queries.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const listAgentThreads = query({
  args: { organizationId: v.id("organizations") },
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
