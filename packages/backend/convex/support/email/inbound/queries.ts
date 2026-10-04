import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { isOrgAdminViewer } from "../../access";

export const getOriginal = query({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.inboundEmailId) {
      return null;
    }
    const conversation = await ctx.db.get(message.conversationId);
    if (
      !(
        conversation &&
        (await isOrgAdminViewer(ctx, conversation.organizationId))
      )
    ) {
      return null;
    }
    const inbound = await ctx.db.get(message.inboundEmailId);
    if (inbound?.fullText === undefined) {
      return null;
    }
    return {
      from: inbound.from,
      fullText: inbound.fullText,
      receivedAt: inbound.receivedAt,
      subject: inbound.subject,
    };
  },
  returns: v.union(
    v.object({
      from: v.string(),
      fullText: v.string(),
      receivedAt: v.number(),
      subject: v.string(),
    }),
    v.null()
  ),
});
