import { v } from "convex/values";
import { query } from "../_generated/server";
import { findConversationIdByThreadToken } from "./thread_tokens";

export const resolve = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const conversationId = await findConversationIdByThreadToken(
      ctx,
      args.token
    );
    if (!conversationId) {
      return null;
    }
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      return null;
    }
    const organization = await ctx.db.get(conversation.organizationId);
    if (!organization) {
      return null;
    }
    return {
      conversationId,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      conversationId: v.id("supportConversations"),
      organization: v.object({
        _id: v.id("organizations"),
        name: v.string(),
        slug: v.string(),
      }),
    })
  ),
});
