import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";

export const acceptInbound = internalMutation({
  args: {
    from: v.string(),
    resendEmailId: v.string(),
    rfcMessageId: v.optional(v.string()),
    subject: v.string(),
    to: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const sameResendEmail = await ctx.db
      .query("supportInboundEmails")
      .withIndex("by_resend_email_id", (q) =>
        q.eq("resendEmailId", args.resendEmailId)
      )
      .first();
    if (sameResendEmail) {
      return;
    }
    const { rfcMessageId } = args;
    if (rfcMessageId) {
      const sameMessage = await ctx.db
        .query("supportInboundEmails")
        .withIndex("by_rfc_message_id", (q) =>
          q.eq("rfcMessageId", rfcMessageId)
        )
        .first();
      if (sameMessage) {
        return;
      }
    }
    const inboundEmailId = await ctx.db.insert("supportInboundEmails", {
      ...args,
      receivedAt: Date.now(),
      status: "pending",
    });
    await ctx.scheduler.runAfter(
      0,
      internal.support.email.inbound.process.processInbound,
      { inboundEmailId, resendEmailId: args.resendEmailId }
    );
  },
});
