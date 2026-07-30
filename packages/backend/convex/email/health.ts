import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const MILLISECONDS_PER_DAY = 86_400_000;
const HIGH_BOUNCE_RATE_THRESHOLD = 0.05;
const MIN_EMAILS_FOR_ALERT = 10;

export const getDailyHealthReport = internalQuery({
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - MILLISECONDS_PER_DAY;

    const recentLogs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_organization_sent")
      .filter((q) => q.gte(q.field("sentAt"), since))
      .collect();

    const byOrg = new Map<
      string,
      { total: number; bounced: number; complained: number }
    >();

    for (const log of recentLogs) {
      const orgId = log.organizationId;
      const existing = byOrg.get(orgId) ?? {
        bounced: 0,
        complained: 0,
        total: 0,
      };
      existing.total++;
      if (log.status === "bounced") {
        existing.bounced++;
      }
      if (log.status === "complained") {
        existing.complained++;
      }
      byOrg.set(orgId, existing);
    }

    const flagged = Array.from(byOrg.entries())
      .filter(([, stats]) => {
        if (stats.total < MIN_EMAILS_FOR_ALERT) {
          return false;
        }
        const bounceRate = stats.bounced / stats.total;
        return bounceRate > HIGH_BOUNCE_RATE_THRESHOLD || stats.complained > 0;
      })
      .map(([orgId, stats]) => ({
        bounced: stats.bounced,
        bounceRate: stats.bounced / stats.total,
        complained: stats.complained,
        organizationId: orgId,
        total: stats.total,
      }));

    return { organizations: flagged };
  },
  returns: v.object({
    organizations: v.array(
      v.object({
        bounced: v.number(),
        bounceRate: v.number(),
        complained: v.number(),
        organizationId: v.string(),
        total: v.number(),
      })
    ),
  }),
});

export const cleanupOldEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const RETENTION_DAYS = 90;
    const cutoff = Date.now() - RETENTION_DAYS * MILLISECONDS_PER_DAY;

    const oldEvents = await ctx.db
      .query("emailEvents")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(500);

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }

    return { deleted: oldEvents.length };
  },
  returns: v.object({ deleted: v.number() }),
});
