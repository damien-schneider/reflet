import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { loadLatencyByHour, loadUptimeBarsByMonitor } from "./history";
import { listActiveIncidents } from "./lib/activeIncidents";
import {
  isMaintenanceActive,
  listUnfinishedMaintenances,
} from "./lib/maintenanceWindows";
import {
  affectedMonitorNames,
  canViewStatusPage,
  isPublicNotice,
  isShownOnStatusPage,
  overallStatusOf,
  withMaintenanceStatus,
} from "./lib/visibility";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INCIDENT_HISTORY_DAYS = 14;
const MAX_INCIDENT_HISTORY_DAYS = 90;
const UPCOMING_MAINTENANCE_DAYS = 14;

const findViewableOrganization = async (ctx: QueryCtx, slug: string) => {
  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (organization && (await canViewStatusPage(ctx, organization))) {
    return organization;
  }
  return null;
};

const listMonitors = (ctx: QueryCtx, organizationId: Id<"organizations">) =>
  ctx.db
    .query("statusMonitors")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

const loadUpdatesOldestFirst = async (
  ctx: QueryCtx,
  incidentId: Id<"statusIncidents">
) => {
  const updates = await ctx.db
    .query("statusIncidentUpdates")
    .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
    .collect();
  return updates
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((update) => ({
      createdAt: update.createdAt,
      message: update.message,
      status: update.status,
    }));
};

export const getPublicStatus = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const org = await findViewableOrganization(ctx, args.orgSlug);
    if (!org) {
      return null;
    }

    const now = Date.now();
    const monitors = await listMonitors(ctx, org._id);
    const publicMonitors = monitors.filter((m) => m.isPublic);
    const publicMonitorIds = new Set(publicMonitors.map((m) => m._id));
    const unfinishedMaintenances = await listUnfinishedMaintenances(
      ctx,
      org._id,
      now
    );
    const shownMonitors = withMaintenanceStatus(
      monitors.filter(isShownOnStatusPage),
      unfinishedMaintenances.filter((m) => isMaintenanceActive(m, now))
    );

    const activeIncidents = (await listActiveIncidents(ctx, org._id)).filter(
      (incident) => isPublicNotice(incident, publicMonitorIds)
    );
    const activeWithUpdates = await Promise.all(
      activeIncidents.map(async (incident) => ({
        _id: incident._id,
        affectedMonitors: affectedMonitorNames(incident, shownMonitors),
        severity: incident.severity,
        startedAt: incident.startedAt,
        status: incident.status,
        title: incident.title,
        updates: (await loadUpdatesOldestFirst(ctx, incident._id)).reverse(),
      }))
    );

    const upcomingCutoff = now + UPCOMING_MAINTENANCE_DAYS * DAY_MS;
    const maintenances = unfinishedMaintenances
      .filter(
        (maintenance) =>
          maintenance.startsAt <= upcomingCutoff &&
          isPublicNotice(maintenance, publicMonitorIds)
      )
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((maintenance) => ({
        _id: maintenance._id,
        affectedMonitors: affectedMonitorNames(maintenance, publicMonitors),
        endsAt: maintenance.endsAt,
        isActive: isMaintenanceActive(maintenance, now),
        message: maintenance.message,
        startsAt: maintenance.startsAt,
        title: maintenance.title,
      }));

    const publicMonitorViews = await Promise.all(
      shownMonitors.map(async (m) => ({
        _id: m._id,
        groupName: m.groupName ?? "Services",
        lastResponseTimeMs: m.lastResponseTimeMs,
        latencyByHour: await loadLatencyByHour(ctx, m._id),
        name: m.name,
        status: m.status,
      }))
    );
    const groupNames = [
      ...new Set(publicMonitorViews.map((m) => m.groupName)),
    ].sort((a, b) => a.localeCompare(b));
    const monitorGroups = groupNames.map((name) => ({
      monitors: publicMonitorViews.filter((m) => m.groupName === name),
      name,
    }));

    return {
      activeIncidents: activeWithUpdates,
      maintenances,
      monitorGroups,
      orgLogo: org.logo,
      orgName: org.name,
      overallStatus: overallStatusOf(shownMonitors),
    };
  },
});

export const getPublicIncidentHistory = query({
  args: { days: v.optional(v.number()), orgSlug: v.string() },
  handler: async (ctx, args) => {
    const org = await findViewableOrganization(ctx, args.orgSlug);
    if (!org) {
      return [];
    }

    const daysBack = Math.min(
      args.days ?? DEFAULT_INCIDENT_HISTORY_DAYS,
      MAX_INCIDENT_HISTORY_DAYS
    );
    const cutoff = Date.now() - daysBack * DAY_MS;
    const incidents = await ctx.db
      .query("statusIncidents")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", org._id).gte("createdAt", cutoff)
      )
      .collect();

    const monitors = await listMonitors(ctx, org._id);
    const monitorNameMap = new Map(
      monitors.filter((m) => m.isPublic).map((m) => [m._id, m.name])
    );
    const publicMonitorIds = new Set(monitorNameMap.keys());
    const resolved = incidents.filter(
      (i) => i.status === "resolved" && isPublicNotice(i, publicMonitorIds)
    );

    const withUpdates = await Promise.all(
      resolved.map(async (incident) => ({
        _id: incident._id,
        affectedMonitors: incident.affectedMonitorIds
          .map((id) => monitorNameMap.get(id))
          .filter(Boolean),
        resolvedAt: incident.resolvedAt,
        severity: incident.severity,
        startedAt: incident.startedAt,
        title: incident.title,
        updates: await loadUpdatesOldestFirst(ctx, incident._id),
      }))
    );

    return withUpdates.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const getPublicUptimeBars = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const org = await findViewableOrganization(ctx, args.orgSlug);
    if (!org) {
      return null;
    }

    const monitors = await listMonitors(ctx, org._id);
    return await loadUptimeBarsByMonitor(
      ctx,
      monitors.filter(isShownOnStatusPage)
    );
  },
});
