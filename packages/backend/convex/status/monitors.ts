import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import { requireOrgAdmin, requireOrgMember } from "../shared/access";
import { MAX_TITLE_LENGTH } from "../shared/constants";
import { assertPublicHttpUrl } from "../shared/outbound/public_fetch";
import { validateInputLength } from "../shared/validators";
import { loadLatencyByHour, loadUptimeBarsByMonitor } from "./history";
import { resolveOutageIncident } from "./lib/autoIncidents";
import { listActiveMaintenances } from "./lib/maintenanceWindows";
import {
  canViewStatusPage,
  isShownOnStatusPage,
  overallStatusOf,
  withMaintenanceStatus,
} from "./lib/visibility";
import { monitorMethod } from "./tableFields";

const MAX_EXPECTED_STATUS_CODES = 10;
const MAX_BODY_KEYWORD_CHARS = 200;

const parseExpectedStatusCodes = (
  codes: number[] | null | undefined
): number[] | undefined => {
  if (!codes) {
    return undefined;
  }
  const uniqueCodes = [...new Set(codes)].sort((a, b) => a - b);
  if (uniqueCodes.length === 0) {
    throw new Error("Add at least one expected status code");
  }
  if (uniqueCodes.length > MAX_EXPECTED_STATUS_CODES) {
    throw new Error(
      `Add at most ${MAX_EXPECTED_STATUS_CODES} expected status codes`
    );
  }
  if (
    uniqueCodes.some(
      (code) => !Number.isInteger(code) || code < 100 || code > 599
    )
  ) {
    throw new Error("Status codes must be whole numbers from 100 to 599");
  }
  return uniqueCodes;
};

const parseBodyKeyword = (
  keyword: string | null | undefined
): string | undefined => {
  const trimmed = keyword?.trim();
  validateInputLength(trimmed, MAX_BODY_KEYWORD_CHARS, "Keyword");
  return trimmed || undefined;
};

const assertKeywordExpectsSuccess = ({
  bodyKeyword,
  expectedStatusCodes,
}: {
  bodyKeyword?: string;
  expectedStatusCodes?: number[];
}): void => {
  const expectsNonSuccess = expectedStatusCodes?.some(
    (code) => code < 200 || code > 299
  );
  if (bodyKeyword !== undefined && expectsNonSuccess) {
    throw new Error(
      "Keyword checks read 2xx responses only, so expected status codes must be from 200 to 299"
    );
  }
};

export const listMonitors = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return await Promise.all(
      monitors.map(async (monitor) => ({
        ...monitor,
        latencyByHour: await loadLatencyByHour(ctx, monitor._id),
      }))
    );
  },
});

export const getAggregateStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (!(organization && (await canViewStatusPage(ctx, organization)))) {
      return { monitorCount: 0, status: "no_monitors" as const };
    }
    const shownMonitors = monitors.filter(isShownOnStatusPage);
    if (shownMonitors.length === 0) {
      return { monitorCount: 0, status: "no_monitors" as const };
    }
    const activeMaintenances = await listActiveMaintenances(
      ctx,
      args.organizationId,
      Date.now()
    );
    return {
      monitorCount: shownMonitors.length,
      status: overallStatusOf(
        withMaintenanceStatus(shownMonitors, activeMaintenances)
      ),
    };
  },
});

export const getMonitorsUptimeBars = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return await loadUptimeBarsByMonitor(ctx, monitors);
  },
});

export const createMonitor = mutation({
  args: {
    alertThreshold: v.optional(v.number()),
    bodyKeyword: v.optional(v.string()),
    checkIntervalMinutes: v.optional(v.number()),
    expectedStatusCodes: v.optional(v.array(v.number())),
    groupName: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    method: v.optional(monitorMethod),
    name: v.string(),
    organizationId: v.id("organizations"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "create monitors");
    validateInputLength(args.name, MAX_TITLE_LENGTH, "Name");
    assertPublicHttpUrl(args.url);
    const bodyKeyword = parseBodyKeyword(args.bodyKeyword);
    const expectedStatusCodes = parseExpectedStatusCodes(
      args.expectedStatusCodes
    );
    assertKeywordExpectsSuccess({ bodyKeyword, expectedStatusCodes });

    const tier = await getOrgTier(ctx, args.organizationId);
    const limits = PLAN_LIMITS[tier];
    const existing = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(limits.maxMonitors);
    if (existing.length >= limits.maxMonitors) {
      throw new Error(
        `Your plan allows up to ${limits.maxMonitors} monitors. Remove one or upgrade to add more.`
      );
    }

    const now = Date.now();
    const requestedInterval = args.checkIntervalMinutes ?? 5;
    const checkIntervalMinutes = Math.max(
      requestedInterval,
      limits.minCheckIntervalMinutes
    );

    return await ctx.db.insert("statusMonitors", {
      alertThreshold: args.alertThreshold ?? 3,
      bodyKeyword,
      checkIntervalMinutes,
      consecutiveFailures: 0,
      createdAt: now,
      expectedStatusCodes,
      groupName: args.groupName,
      isPublic: args.isPublic ?? true,
      method: args.method,
      name: args.name,
      organizationId: args.organizationId,
      status: "operational",
      updatedAt: now,
      url: args.url,
    });
  },
});

export const updateMonitor = mutation({
  args: {
    alertThreshold: v.optional(v.number()),
    bodyKeyword: v.optional(v.union(v.string(), v.null())),
    checkIntervalMinutes: v.optional(v.number()),
    degradedResponseTimeMs: v.optional(v.union(v.number(), v.null())),
    expectedStatusCodes: v.optional(v.union(v.array(v.number()), v.null())),
    groupName: v.optional(v.string()),
    groupOrder: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
    method: v.optional(monitorMethod),
    monitorId: v.id("statusMonitors"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      bodyKeyword,
      degradedResponseTimeMs,
      expectedStatusCodes,
      monitorId,
      ...updates
    } = args;

    const monitor = await ctx.db.get(monitorId);
    if (!monitor) {
      throw new Error("Monitor not found");
    }

    await requireOrgAdmin(ctx, monitor.organizationId, "update monitors");

    validateInputLength(args.name, MAX_TITLE_LENGTH, "Name");
    if (args.url !== undefined) {
      assertPublicHttpUrl(args.url);
    }
    if (
      typeof degradedResponseTimeMs === "number" &&
      !(degradedResponseTimeMs > 0)
    ) {
      throw new Error("Slow response threshold must be a positive duration");
    }
    const responseAssertionChanges = {
      ...(bodyKeyword === undefined
        ? {}
        : { bodyKeyword: parseBodyKeyword(bodyKeyword) }),
      ...(expectedStatusCodes === undefined
        ? {}
        : {
            expectedStatusCodes: parseExpectedStatusCodes(expectedStatusCodes),
          }),
    };
    assertKeywordExpectsSuccess({ ...monitor, ...responseAssertionChanges });

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );

    if (args.checkIntervalMinutes !== undefined) {
      const tier = await getOrgTier(ctx, monitor.organizationId);
      filtered.checkIntervalMinutes = Math.max(
        args.checkIntervalMinutes,
        PLAN_LIMITS[tier].minCheckIntervalMinutes
      );
    }

    await ctx.db.patch(monitorId, {
      ...filtered,
      ...responseAssertionChanges,
      ...(degradedResponseTimeMs === undefined
        ? {}
        : { degradedResponseTimeMs: degradedResponseTimeMs ?? undefined }),
      updatedAt: Date.now(),
    });
  },
});

export const setMonitorPaused = mutation({
  args: { monitorId: v.id("statusMonitors"), paused: v.boolean() },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) {
      throw new Error("Monitor not found");
    }
    await requireOrgAdmin(ctx, monitor.organizationId, "pause monitors");

    await ctx.db.patch(args.monitorId, {
      consecutiveFailures: 0,
      status: args.paused ? "paused" : "operational",
      updatedAt: Date.now(),
    });
    if (args.paused) {
      await resolveOutageIncident(ctx, monitor, "monitoring_paused");
    }
    return null;
  },
  returns: v.null(),
});

export const deleteMonitor = mutation({
  args: { monitorId: v.id("statusMonitors") },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) {
      throw new Error("Monitor not found");
    }

    await requireOrgAdmin(ctx, monitor.organizationId, "delete monitors");

    await ctx.db.delete(args.monitorId);
    await ctx.scheduler.runAfter(
      0,
      internal.status.history.purgeMonitorHistory,
      { monitorId: args.monitorId }
    );
  },
});

export const reorderMonitors = mutation({
  args: {
    updates: v.array(
      v.object({
        groupName: v.optional(v.string()),
        groupOrder: v.optional(v.number()),
        monitorId: v.id("statusMonitors"),
        order: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const update of args.updates) {
      const monitor = await ctx.db.get(update.monitorId);
      if (!monitor) {
        throw new Error("Monitor not found");
      }

      await requireOrgAdmin(ctx, monitor.organizationId, "reorder monitors");

      await ctx.db.patch(update.monitorId, {
        groupName: update.groupName,
        groupOrder: update.groupOrder,
        order: update.order,
        updatedAt: now,
      });
    }
  },
});
