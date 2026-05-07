/**
 * Community post mutations — create posts discovered by Growth agent.
 * Validation scores written by Validator agent.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { communityPlatform } from "../schema/validators";

export const createCommunityPost = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    platform: communityPlatform,
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

export const linkDraftToCommunityPost = internalMutation({
  args: {
    communityPostId: v.id("autopilotCommunityPosts"),
    draftDocId: v.id("autopilotDocuments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.communityPostId, {
      draftDocId: args.draftDocId,
      updatedAt: Date.now(),
    });
    return null;
  },
});
