import { paginationOptsValidator } from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import {
  DnsResolutionUnavailableError,
  describeFetchFailure,
  fetchPublicUrl,
} from "../shared/outbound/public_fetch";
import { recordUptimeSample } from "./history";
import { openOutageIncident, resolveOutageIncident } from "./lib/autoIncidents";
import {
  CHECK_TIMEOUT_MS,
  type DueMonitor,
  dueMonitor,
  judgeStatusCode,
  type ProbeResult,
  probeConfirmingFailure,
} from "./lib/probe";
import type { monitorMethod } from "./tableFields";

const MONITOR_PAGE_SIZE = 200;
const CHECK_BATCH_SIZE = 10;
const HEAD_REJECTION_STATUS_CODES: Record<number, true> = {
  405: true,
  501: true,
};
// Checks land up to ~25s after the cron tick; without slack a 1-minute monitor runs every 2 minutes.
const DUE_TOLERANCE_MS = 45_000;

const dueMonitorsPage = v.object({
  continueCursor: v.string(),
  isDone: v.boolean(),
  monitors: v.array(dueMonitor),
});

export const getDueMonitorsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    const page = await ctx.db
      .query("statusMonitors")
      .paginate(args.paginationOpts);

    const orgMinInterval = new Map<Id<"organizations">, number>();
    const getOrgMinInterval = async (
      orgId: Id<"organizations">
    ): Promise<number> => {
      const cached = orgMinInterval.get(orgId);
      if (cached !== undefined) {
        return cached;
      }
      const tier = await getOrgTier(ctx, orgId);
      const min = PLAN_LIMITS[tier].minCheckIntervalMinutes;
      orgMinInterval.set(orgId, min);
      return min;
    };

    const monitors: DueMonitor[] = [];
    for (const m of page.page) {
      if (m.status === "paused") {
        continue;
      }
      const tierMin = await getOrgMinInterval(m.organizationId);
      const effectiveInterval = Math.max(m.checkIntervalMinutes, tierMin);
      const isDue =
        !m.lastCheckedAt ||
        now + DUE_TOLERANCE_MS >= m.lastCheckedAt + effectiveInterval * 60_000;
      if (isDue) {
        monitors.push({
          _id: m._id,
          bodyKeyword: m.bodyKeyword,
          expectedStatusCodes: m.expectedStatusCodes,
          method: m.method,
          url: m.url,
        });
      }
    }
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      monitors,
    };
  },
  returns: dueMonitorsPage,
});

export const recordCheck = internalMutation({
  args: {
    errorMessage: v.optional(v.string()),
    isUp: v.boolean(),
    monitorId: v.id("statusMonitors"),
    responseTimeMs: v.optional(v.number()),
    statusCode: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor || monitor.status === "paused") {
      return null;
    }

    const now = Date.now();
    await ctx.db.insert("statusChecks", {
      ...args,
      checkedAt: now,
      organizationId: monitor.organizationId,
    });
    await recordUptimeSample(ctx, { ...args, checkedAt: now });

    if (args.isUp) {
      const isSlow =
        monitor.degradedResponseTimeMs !== undefined &&
        args.responseTimeMs !== undefined &&
        args.responseTimeMs > monitor.degradedResponseTimeMs;
      await ctx.db.patch(monitor._id, {
        consecutiveFailures: 0,
        lastCheckedAt: now,
        lastResponseTimeMs: args.responseTimeMs,
        status: isSlow ? "degraded" : "operational",
        updatedAt: now,
      });
      await resolveOutageIncident(ctx, monitor, "monitor_recovered");
      return null;
    }

    const consecutiveFailures = monitor.consecutiveFailures + 1;
    await ctx.db.patch(monitor._id, {
      consecutiveFailures,
      lastCheckedAt: now,
      lastResponseTimeMs: args.responseTimeMs,
      status:
        consecutiveFailures >= monitor.alertThreshold
          ? "major_outage"
          : "degraded",
      updatedAt: now,
    });
    if (consecutiveFailures === monitor.alertThreshold) {
      await openOutageIncident(ctx, monitor);
    }
    return null;
  },
  returns: v.null(),
});

const probeOnce = async (
  monitor: DueMonitor,
  method: Infer<typeof monitorMethod>
): Promise<ProbeResult | null> => {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const { response, requestDurationMs } = await fetchPublicUrl(monitor.url, {
      method,
      signal: controller.signal,
    });
    await response.body?.cancel();
    return {
      ...judgeStatusCode(
        monitor.expectedStatusCodes,
        response.status,
        response.status >= 200 && response.status < 400
      ),
      responseTimeMs: requestDurationMs,
      statusCode: response.status,
    };
  } catch (error) {
    if (error instanceof DnsResolutionUnavailableError) {
      return null;
    }
    return {
      errorMessage: describeFetchFailure(error),
      isUp: false,
      responseTimeMs: Date.now() - startTime,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const probeMonitor = (monitor: DueMonitor): Promise<ProbeResult | null> => {
  const method = monitor.method ?? "HEAD";
  return probeConfirmingFailure((failedProbe) => {
    const serverRejectedHead =
      method === "HEAD" &&
      failedProbe?.statusCode !== undefined &&
      HEAD_REJECTION_STATUS_CODES[failedProbe.statusCode] === true;
    return probeOnce(monitor, serverRejectedHead ? "GET" : method);
  });
};

const checkMonitor = async (
  ctx: ActionCtx,
  monitor: DueMonitor
): Promise<void> => {
  const probe = await probeMonitor(monitor);
  if (probe) {
    await ctx.runMutation(internal.status.healthCheck.recordCheck, {
      ...probe,
      monitorId: monitor._id,
    });
  }
};

export const checkMonitorBatch = internalAction({
  args: { monitors: v.array(dueMonitor) },
  handler: async (ctx, args) => {
    await Promise.all(args.monitors.map((m) => checkMonitor(ctx, m)));
  },
  returns: v.null(),
});

const inCheckBatches = (monitors: DueMonitor[]): DueMonitor[][] =>
  Array.from(
    { length: Math.ceil(monitors.length / CHECK_BATCH_SIZE) },
    (_, i) => monitors.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE)
  );

export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const page: Infer<typeof dueMonitorsPage> = await ctx.runQuery(
        internal.status.healthCheck.getDueMonitorsPage,
        { paginationOpts: { cursor, numItems: MONITOR_PAGE_SIZE } }
      );
      const keywordMonitors = page.monitors.filter(
        (m) => m.bodyKeyword !== undefined
      );
      const statusMonitors = page.monitors.filter(
        (m) => m.bodyKeyword === undefined
      );
      for (const monitors of inCheckBatches(statusMonitors)) {
        await ctx.scheduler.runAfter(
          0,
          internal.status.healthCheck.checkMonitorBatch,
          { monitors }
        );
      }
      for (const monitors of inCheckBatches(keywordMonitors)) {
        await ctx.scheduler.runAfter(
          0,
          internal.status.keywordProbe.checkKeywordMonitors,
          { monitors }
        );
      }
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
  },
  returns: v.null(),
});
