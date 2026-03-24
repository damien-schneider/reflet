import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const MILLISECONDS_PER_DAY = 86_400_000;

export const getEmailStats = query({
  args: {
    organizationId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  returns: v.object({
    total: v.number(),
    delivered: v.number(),
    opened: v.number(),
    clicked: v.number(),
    bounced: v.number(),
    complained: v.number(),
    deliveryRate: v.number(),
    openRate: v.number(),
    clickRate: v.number(),
    bounceRate: v.number(),
  }),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const days = args.days ?? 30;
    const since = Date.now() - days * MILLISECONDS_PER_DAY;

    const logs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_organization_sent", (q) =>
        q.eq("organizationId", args.organizationId).gte("sentAt", since)
      )
      .collect();

    const total = logs.length;
    if (total === 0) {
      return {
        total: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };
    }

    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let complained = 0;

    for (const log of logs) {
      if (log.deliveredAt) {
        delivered++;
      }
      if (log.openedAt) {
        opened++;
      }
      if (log.clickedAt) {
        clicked++;
      }
      if (log.status === "bounced") {
        bounced++;
      }
      if (log.status === "complained") {
        complained++;
      }
    }

    return {
      total,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      deliveryRate: total > 0 ? delivered / total : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
      clickRate: delivered > 0 ? clicked / delivered : 0,
      bounceRate: total > 0 ? bounced / total : 0,
    };
  },
});

export const getEmailStatsByType = query({
  args: {
    organizationId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      emailType: v.string(),
      total: v.number(),
      delivered: v.number(),
      opened: v.number(),
      bounced: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const days = args.days ?? 30;
    const since = Date.now() - days * MILLISECONDS_PER_DAY;

    const logs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_organization_sent", (q) =>
        q.eq("organizationId", args.organizationId).gte("sentAt", since)
      )
      .collect();

    const byType = new Map<
      string,
      { total: number; delivered: number; opened: number; bounced: number }
    >();

    for (const log of logs) {
      const existing = byType.get(log.emailType) ?? {
        total: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
      };
      existing.total++;
      if (log.deliveredAt) {
        existing.delivered++;
      }
      if (log.openedAt) {
        existing.opened++;
      }
      if (log.status === "bounced") {
        existing.bounced++;
      }
      byType.set(log.emailType, existing);
    }

    return [...byType.entries()].map(([emailType, stats]) => ({
      emailType,
      ...stats,
    }));
  },
});

export const getEmailTimeline = query({
  args: {
    organizationId: v.id("organizations"),
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      sent: v.number(),
      delivered: v.number(),
      opened: v.number(),
      bounced: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const days = args.days ?? 30;
    const since = Date.now() - days * MILLISECONDS_PER_DAY;

    const logs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_organization_sent", (q) =>
        q.eq("organizationId", args.organizationId).gte("sentAt", since)
      )
      .collect();

    const byDay = new Map<
      string,
      { sent: number; delivered: number; opened: number; bounced: number }
    >();

    for (const log of logs) {
      const date = new Date(log.sentAt).toISOString().split("T")[0] ?? "";
      const existing = byDay.get(date) ?? {
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
      };
      existing.sent++;
      if (log.deliveredAt) {
        existing.delivered++;
      }
      if (log.openedAt) {
        existing.opened++;
      }
      if (log.status === "bounced") {
        existing.bounced++;
      }
      byDay.set(date, existing);
    }

    return [...byDay.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getRecentEmails = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("emailSendLog"),
      to: v.string(),
      subject: v.string(),
      emailType: v.string(),
      status: v.string(),
      sentAt: v.number(),
      deliveredAt: v.optional(v.number()),
      openedAt: v.optional(v.number()),
      bouncedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const limit = Math.min(args.limit ?? 50, 100);

    const logs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_organization_sent", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return logs.map((log) => ({
      _id: log._id,
      to: log.to,
      subject: log.subject,
      emailType: log.emailType,
      status: log.status,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      openedAt: log.openedAt,
      bouncedAt: log.bouncedAt,
    }));
  },
});

export const getReleaseEmailStats = query({
  args: {
    releaseId: v.id("releases"),
  },
  returns: v.object({
    total: v.number(),
    delivered: v.number(),
    opened: v.number(),
    clicked: v.number(),
    bounced: v.number(),
  }),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const logs = await ctx.db
      .query("emailSendLog")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;

    for (const log of logs) {
      if (log.deliveredAt) {
        delivered++;
      }
      if (log.openedAt) {
        opened++;
      }
      if (log.clickedAt) {
        clicked++;
      }
      if (log.status === "bounced") {
        bounced++;
      }
    }

    return {
      total: logs.length,
      delivered,
      opened,
      clicked,
      bounced,
    };
  },
});
