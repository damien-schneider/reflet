import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const MILLISECONDS_PER_DAY = 86_400_000;

export const getEmailStats = query({
  args: {
    days: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
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
        bounced: 0,
        bounceRate: 0,
        clicked: 0,
        clickRate: 0,
        complained: 0,
        delivered: 0,
        deliveryRate: 0,
        opened: 0,
        openRate: 0,
        total: 0,
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
      bounced,
      bounceRate: total > 0 ? bounced / total : 0,
      clicked,
      clickRate: delivered > 0 ? clicked / delivered : 0,
      complained,
      delivered,
      deliveryRate: total > 0 ? delivered / total : 0,
      opened,
      openRate: delivered > 0 ? opened / delivered : 0,
      total,
    };
  },
  returns: v.object({
    bounced: v.number(),
    bounceRate: v.number(),
    clicked: v.number(),
    clickRate: v.number(),
    complained: v.number(),
    delivered: v.number(),
    deliveryRate: v.number(),
    opened: v.number(),
    openRate: v.number(),
    total: v.number(),
  }),
});

export const getEmailStatsByType = query({
  args: {
    days: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
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
        bounced: 0,
        delivered: 0,
        opened: 0,
        total: 0,
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
  returns: v.array(
    v.object({
      bounced: v.number(),
      delivered: v.number(),
      emailType: v.string(),
      opened: v.number(),
      total: v.number(),
    })
  ),
});

export const getEmailTimeline = query({
  args: {
    days: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
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
        bounced: 0,
        delivered: 0,
        opened: 0,
        sent: 0,
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
  returns: v.array(
    v.object({
      bounced: v.number(),
      date: v.string(),
      delivered: v.number(),
      opened: v.number(),
      sent: v.number(),
    })
  ),
});

export const getRecentEmails = query({
  args: {
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
  },
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
      bouncedAt: log.bouncedAt,
      deliveredAt: log.deliveredAt,
      emailType: log.emailType,
      openedAt: log.openedAt,
      sentAt: log.sentAt,
      status: log.status,
      subject: log.subject,
      to: log.to,
    }));
  },
  returns: v.array(
    v.object({
      _id: v.id("emailSendLog"),
      bouncedAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
      emailType: v.string(),
      openedAt: v.optional(v.number()),
      sentAt: v.number(),
      status: v.string(),
      subject: v.string(),
      to: v.string(),
    })
  ),
});

export const getReleaseEmailStats = query({
  args: {
    releaseId: v.id("releases"),
  },
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
      bounced,
      clicked,
      delivered,
      opened,
      total: logs.length,
    };
  },
  returns: v.object({
    bounced: v.number(),
    clicked: v.number(),
    delivered: v.number(),
    opened: v.number(),
    total: v.number(),
  }),
});
