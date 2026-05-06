/**
 * Community post mutations — create posts discovered by Growth agent.
 * Validation scores written by Validator agent.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const createCommunityPost = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    platform: v.union(
      v.literal("reddit"),
      v.literal("hackernews"),
      v.literal("twitter"),
      v.literal("linkedin"),
      v.literal("indiehackers"),
      v.literal("devto"),
      v.literal("other")
    ),
    authorName: v.string(),
    authorUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    content: v.string(),
    sourceUrl: v.string(),
    parentThreadUrl: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    matchedPersonaIds: v.array(v.id("autopilotPersonas")),
    matchedUseCaseIds: v.array(v.id("autopilotUseCases")),
  },
  returns: v.id("autopilotCommunityPosts"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotCommunityPosts", {
      ...args,
      discoveredAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});
