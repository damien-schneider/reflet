import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const UPTIME_HISTORY_DAYS = 90;
export const LATENCY_HISTORY_HOURS = 24;
const RAW_CHECK_RETENTION_MS = 2 * DAY_MS;
const DELETE_BATCH_SIZE = 500;

type BucketTable = "statusUptimeDays" | "statusUptimeHours";

export interface BucketTotals {
  checks: number;
  responseTimeMsSum: number;
  upChecks: number;
}

export interface UptimeSample {
  checkedAt: number;
  isUp: boolean;
  monitorId: Id<"statusMonitors">;
  responseTimeMs?: number;
}

export const startOfUtcHour = (timestamp: number): number =>
  timestamp - (timestamp % HOUR_MS);

export const startOfUtcDay = (timestamp: number): number =>
  timestamp - (timestamp % DAY_MS);

export const totalsOfSamples = (
  samples: Pick<UptimeSample, "isUp" | "responseTimeMs">[]
): BucketTotals => {
  const totals = { checks: 0, responseTimeMsSum: 0, upChecks: 0 };
  for (const sample of samples) {
    totals.checks++;
    if (sample.isUp) {
      totals.upChecks++;
      totals.responseTimeMsSum += sample.responseTimeMs ?? 0;
    }
  }
  return totals;
};

const findBucket = (
  ctx: QueryCtx,
  table: BucketTable,
  monitorId: Id<"statusMonitors">,
  bucketStart: number
) =>
  ctx.db
    .query(table)
    .withIndex("by_monitor_start", (q) =>
      q.eq("monitorId", monitorId).eq("bucketStart", bucketStart)
    )
    .unique();

const addToBucket = async (
  ctx: MutationCtx,
  table: BucketTable,
  sample: UptimeSample,
  bucketStart: number
): Promise<void> => {
  const sampleTotals = totalsOfSamples([sample]);
  const bucket = await findBucket(ctx, table, sample.monitorId, bucketStart);
  if (!bucket) {
    await ctx.db.insert(table, {
      ...sampleTotals,
      bucketStart,
      monitorId: sample.monitorId,
    });
    return;
  }
  await ctx.db.patch(bucket._id, {
    checks: bucket.checks + sampleTotals.checks,
    responseTimeMsSum:
      bucket.responseTimeMsSum + sampleTotals.responseTimeMsSum,
    upChecks: bucket.upChecks + sampleTotals.upChecks,
  });
};

export const recordUptimeSample = async (
  ctx: MutationCtx,
  sample: UptimeSample
): Promise<void> => {
  await addToBucket(
    ctx,
    "statusUptimeHours",
    sample,
    startOfUtcHour(sample.checkedAt)
  );
  await addToBucket(
    ctx,
    "statusUptimeDays",
    sample,
    startOfUtcDay(sample.checkedAt)
  );
};

/** Raw checks only cover the last 48h once pruned, so a rebuild may raise a bucket but never shrink one. */
export const rebuildBucket = async (
  ctx: MutationCtx,
  table: BucketTable,
  monitorId: Id<"statusMonitors">,
  bucketStart: number,
  totals: BucketTotals
): Promise<void> => {
  const bucket = await findBucket(ctx, table, monitorId, bucketStart);
  if (!bucket) {
    if (totals.checks > 0) {
      await ctx.db.insert(table, { ...totals, bucketStart, monitorId });
    }
    return;
  }
  if (totals.checks > bucket.checks) {
    await ctx.db.patch(bucket._id, totals);
  }
};

const toPercentage = (upChecks: number, checks: number): number =>
  checks > 0 ? Math.round((upChecks / checks) * 10_000) / 100 : 100;

const bucketsSince = (
  ctx: QueryCtx,
  table: BucketTable,
  monitorId: Id<"statusMonitors">,
  since: number
): Promise<Doc<BucketTable>[]> =>
  ctx.db
    .query(table)
    .withIndex("by_monitor_start", (q) =>
      q.eq("monitorId", monitorId).gte("bucketStart", since)
    )
    .collect();

const sumChecks = (buckets: BucketTotals[]) => {
  let checks = 0;
  let upChecks = 0;
  for (const bucket of buckets) {
    checks += bucket.checks;
    upChecks += bucket.upChecks;
  }
  return { checks, upChecks };
};

export const loadUptimeBars = async (
  ctx: QueryCtx,
  monitorId: Id<"statusMonitors">
) => {
  const firstDay =
    startOfUtcDay(Date.now()) - (UPTIME_HISTORY_DAYS - 1) * DAY_MS;
  const days = await bucketsSince(ctx, "statusUptimeDays", monitorId, firstDay);
  const window = sumChecks(days);
  return {
    days: days.map((day) => ({
      date: new Date(day.bucketStart)
        .toISOString()
        .slice(0, "YYYY-MM-DD".length),
      uptimePercentage: toPercentage(day.upChecks, day.checks),
    })),
    monitorId,
    overallUptime: toPercentage(window.upChecks, window.checks),
  };
};

export const loadUptimeBarsByMonitor = async (
  ctx: QueryCtx,
  monitors: Pick<Doc<"statusMonitors">, "_id">[]
) => {
  const bars = await Promise.all(
    monitors.map((monitor) => loadUptimeBars(ctx, monitor._id))
  );
  return Object.fromEntries(bars.map((bar) => [bar.monitorId, bar]));
};

export const loadLatencyByHour = async (
  ctx: QueryCtx,
  monitorId: Id<"statusMonitors">
) => {
  const firstHour =
    startOfUtcHour(Date.now()) - (LATENCY_HISTORY_HOURS - 1) * HOUR_MS;
  const hours = await bucketsSince(
    ctx,
    "statusUptimeHours",
    monitorId,
    firstHour
  );
  return hours
    .filter((hour) => hour.upChecks > 0)
    .map((hour) => ({
      hourStart: hour.bucketStart,
      responseTimeMs: Math.round(hour.responseTimeMsSum / hour.upChecks),
    }));
};

const deleteBucketsBefore = async (
  ctx: MutationCtx,
  table: BucketTable,
  cutoff: number
): Promise<number> => {
  const expired = await ctx.db
    .query(table)
    .withIndex("by_start", (q) => q.lt("bucketStart", cutoff))
    .take(DELETE_BATCH_SIZE);
  for (const bucket of expired) {
    await ctx.db.delete(bucket._id);
  }
  return expired.length;
};

const deleteChecksBefore = async (
  ctx: MutationCtx,
  cutoff: number
): Promise<number> => {
  const expired = await ctx.db
    .query("statusChecks")
    .withIndex("by_checked_at", (q) => q.lt("checkedAt", cutoff))
    .take(DELETE_BATCH_SIZE);
  for (const check of expired) {
    await ctx.db.delete(check._id);
  }
  return expired.length;
};

export const pruneStatusHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const deletedCounts = [
      await deleteChecksBefore(ctx, now - RAW_CHECK_RETENTION_MS),
      await deleteBucketsBefore(
        ctx,
        "statusUptimeHours",
        startOfUtcHour(now) - LATENCY_HISTORY_HOURS * HOUR_MS
      ),
      await deleteBucketsBefore(
        ctx,
        "statusUptimeDays",
        startOfUtcDay(now) - UPTIME_HISTORY_DAYS * DAY_MS
      ),
    ];
    if (deletedCounts.some((count) => count === DELETE_BATCH_SIZE)) {
      await ctx.scheduler.runAfter(
        0,
        internal.status.history.pruneStatusHistory,
        {}
      );
    }
    return null;
  },
  returns: v.null(),
});

const deleteMonitorRows = async (
  ctx: MutationCtx,
  table: BucketTable | "statusChecks",
  monitorId: Id<"statusMonitors">
): Promise<number> => {
  const rows =
    table === "statusChecks"
      ? await ctx.db
          .query(table)
          .withIndex("by_monitor_time", (q) => q.eq("monitorId", monitorId))
          .take(DELETE_BATCH_SIZE)
      : await ctx.db
          .query(table)
          .withIndex("by_monitor_start", (q) => q.eq("monitorId", monitorId))
          .take(DELETE_BATCH_SIZE);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
};

export const purgeMonitorHistory = internalMutation({
  args: { monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    const deletedCounts = [
      await deleteMonitorRows(ctx, "statusChecks", args.monitorId),
      await deleteMonitorRows(ctx, "statusUptimeHours", args.monitorId),
      await deleteMonitorRows(ctx, "statusUptimeDays", args.monitorId),
    ];
    if (deletedCounts.some((count) => count === DELETE_BATCH_SIZE)) {
      await ctx.scheduler.runAfter(
        0,
        internal.status.history.purgeMonitorHistory,
        args
      );
    }
    return null;
  },
  returns: v.null(),
});
