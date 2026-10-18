import { ShardedCounter } from "@convex-dev/sharded-counter";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const voteCounters = new ShardedCounter(components.shardedCounter, {
  defaultShards: 8,
});

export const deleteRetiredOrganization = internalMutation({
  args: {
    apiKeyIds: v.array(v.id("organizationApiKeys")),
    feedbackIds: v.array(v.id("feedback")),
    memberIds: v.array(v.id("organizationMembers")),
    organizationId: v.id("organizations"),
    statusIds: v.array(v.id("organizationStatuses")),
    voteIds: v.array(v.id("feedbackVotes")),
  },
  handler: async (ctx, args) => {
    for (const feedbackId of args.feedbackIds) {
      await voteCounters.reset(ctx, feedbackId);
    }
    const ids = [
      ...args.voteIds,
      ...args.feedbackIds,
      ...args.statusIds,
      ...args.apiKeyIds,
      ...args.memberIds,
      args.organizationId,
    ];
    for (const id of ids) {
      await ctx.db.delete(id);
    }
    return ids.length;
  },
});
