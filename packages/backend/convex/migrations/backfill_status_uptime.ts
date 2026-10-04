import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import {
  DAY_MS,
  HOUR_MS,
  LATENCY_HISTORY_HOURS,
  rebuildBucket,
  startOfUtcDay,
  startOfUtcHour,
  totalsOfSamples,
  UPTIME_HISTORY_DAYS,
} from "../status/history";

const MONITORS_PER_PAGE = 10;

export const backfillStatusUptime = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("statusMonitors")
      .paginate({ cursor: args.cursor ?? null, numItems: MONITORS_PER_PAGE });
    const today = startOfUtcDay(Date.now());
    for (const monitor of page.page) {
      for (let daysAgo = 0; daysAgo < UPTIME_HISTORY_DAYS; daysAgo++) {
        await ctx.scheduler.runAfter(
          0,
          internal.migrations.backfill_status_uptime.backfillMonitorDay,
          { dayStart: today - daysAgo * DAY_MS, monitorId: monitor._id }
        );
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfill_status_uptime.backfillStatusUptime,
        { cursor: page.continueCursor }
      );
    }
    return null;
  },
  returns: v.null(),
});

export const backfillMonitorDay = internalMutation({
  args: { dayStart: v.number(), monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    const checks = await ctx.db
      .query("statusChecks")
      .withIndex("by_monitor_time", (q) =>
        q
          .eq("monitorId", args.monitorId)
          .gte("checkedAt", args.dayStart)
          .lt("checkedAt", args.dayStart + DAY_MS)
      )
      .collect();
    await rebuildBucket(
      ctx,
      "statusUptimeDays",
      args.monitorId,
      args.dayStart,
      totalsOfSamples(checks)
    );

    const latencyWindowStart =
      startOfUtcHour(Date.now()) - LATENCY_HISTORY_HOURS * HOUR_MS;
    const checksByHour = new Map<number, typeof checks>();
    for (const check of checks) {
      if (check.checkedAt < latencyWindowStart) {
        continue;
      }
      const hourStart = startOfUtcHour(check.checkedAt);
      const hourChecks = checksByHour.get(hourStart);
      if (hourChecks) {
        hourChecks.push(check);
      } else {
        checksByHour.set(hourStart, [check]);
      }
    }
    for (const [hourStart, hourChecks] of checksByHour) {
      await rebuildBucket(
        ctx,
        "statusUptimeHours",
        args.monitorId,
        hourStart,
        totalsOfSamples(hourChecks)
      );
    }
    return null;
  },
  returns: v.null(),
});
