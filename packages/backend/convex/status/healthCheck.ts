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
import { monitorMethod } from "./tableFields";

const MONITOR_PAGE_SIZE = 200;
const CHECK_BATCH_SIZE = 10;
const CHECK_TIMEOUT_MS = 10_000;
const HEAD_REJECTION_STATUS_CODES: Record<number, true> = {
  405: true,
  501: true,
};
/** Checks finish up to ~25s after the minute cron fires; without slack a 1-minute monitor would only be due every 2 minutes. */
const DUE_TOLERANCE_MS = 45_000;

const dueMonitor = v.object({
  _id: v.id("statusMonitors"),
  method: v.optional(monitorMethod),
  url: v.string(),
});

type DueMonitor = Infer<typeof dueMonitor>;

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
      // Enforce tier minimum even if stored value is lower (e.g. after downgrade)
      const tierMin = await getOrgMinInterval(m.organizationId);
      const effectiveInterval = Math.max(m.checkIntervalMinutes, tierMin);
      const isDue =
        !m.lastCheckedAt ||
        now + DUE_TOLERANCE_MS >= m.lastCheckedAt + effectiveInterval * 60_000;
      if (isDue) {
        monitors.push({ _id: m._id, method: m.method, url: m.url });
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
      await resolveOutageIncident(ctx, monitor);
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

interface ProbeResult {
  errorMessage?: string;
  isUp: boolean;
  responseTimeMs: number;
  statusCode?: number;
}

const probeOnce = async (
  url: string,
  method: Infer<typeof monitorMethod>
): Promise<ProbeResult | null> => {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const { response, requestDurationMs } = await fetchPublicUrl(url, {
      method,
      signal: controller.signal,
    });
    await response.body?.cancel();
    return {
      isUp: response.status >= 200 && response.status < 400,
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

/** A failure only counts once a second request confirms it; a server rejecting HEAD is confirmed with GET. */
const probeMonitor = async (
  monitor: DueMonitor
): Promise<ProbeResult | null> => {
  const method = monitor.method ?? "HEAD";
  const firstProbe = await probeOnce(monitor.url, method);
  if (!firstProbe || firstProbe.isUp) {
    return firstProbe;
  }
  const serverRejectedHead =
    method === "HEAD" &&
    firstProbe.statusCode !== undefined &&
    HEAD_REJECTION_STATUS_CODES[firstProbe.statusCode] === true;
  return await probeOnce(monitor.url, serverRejectedHead ? "GET" : method);
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

/** Fans due monitors out into small scheduled batches so one tenant's slow targets can't stall the rest. */
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
      for (let i = 0; i < page.monitors.length; i += CHECK_BATCH_SIZE) {
        await ctx.scheduler.runAfter(
          0,
          internal.status.healthCheck.checkMonitorBatch,
          { monitors: page.monitors.slice(i, i + CHECK_BATCH_SIZE) }
        );
      }
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
  },
  returns: v.null(),
});
