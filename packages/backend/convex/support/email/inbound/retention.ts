import { internalMutation } from "../../../_generated/server";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DELETED_PER_STATUS = 500;
const DISCARDED_STATUSES = ["unrouted", "rejected"] as const;

export const cleanupInboundEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    for (const status of DISCARDED_STATUSES) {
      const expired = await ctx.db
        .query("supportInboundEmails")
        .withIndex("by_status_received", (q) =>
          q.eq("status", status).lt("receivedAt", cutoff)
        )
        .take(MAX_DELETED_PER_STATUS);
      for (const inbound of expired) {
        await ctx.db.delete(inbound._id);
      }
    }
  },
});
