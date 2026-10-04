import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server";
import { requireOrgAdmin, requireOrgMember } from "../shared/access";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";
import {
  notifySubscribers,
  publicMonitorNamesFor,
  statusPageUrlOf,
} from "./incidentNotifications";
import { openOutageIncident } from "./lib/autoIncidents";
import {
  isMaintenanceActive,
  isUnderMaintenance,
  listUnfinishedMaintenances,
} from "./lib/maintenanceWindows";
import { affectedMonitorNames } from "./lib/visibility";

/** Failures during the window opened no incident, so monitors still down when it closes are reported now. */
const reportOutagesLeftByMaintenance = async (
  ctx: MutationCtx,
  maintenance: Doc<"statusMaintenances">
): Promise<void> => {
  const monitors = await ctx.db
    .query("statusMonitors")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", maintenance.organizationId)
    )
    .collect();
  const monitorsStillDown = monitors.filter(
    (monitor) =>
      monitor.status === "major_outage" &&
      isUnderMaintenance([maintenance], monitor._id)
  );
  for (const monitor of monitorsStillDown) {
    await openOutageIncident(ctx, monitor);
  }
};

const announceToSubscribers = async (
  ctx: MutationCtx,
  maintenance: Omit<
    Doc<"statusMaintenances">,
    "_creationTime" | "_id" | "createdAt" | "updatedAt"
  >
): Promise<void> => {
  const organization = await ctx.db.get(maintenance.organizationId);
  if (!organization) {
    return;
  }
  const publicMonitorNames = await publicMonitorNamesFor(
    ctx,
    organization,
    maintenance
  );
  if (!publicMonitorNames) {
    return;
  }
  await notifySubscribers(ctx, organization._id, {
    email: {
      affectedMonitorNames: publicMonitorNames,
      endsAt: maintenance.endsAt,
      message: maintenance.message,
      organizationName: organization.name,
      startsAt: maintenance.startsAt,
      statusPageUrl: statusPageUrlOf(organization),
      title: maintenance.title,
    },
    kind: "maintenance",
  });
};

export const listMaintenances = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

    const now = Date.now();
    const maintenances = await listUnfinishedMaintenances(
      ctx,
      args.organizationId,
      now
    );
    const monitors = await ctx.db
      .query("statusMonitors")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return maintenances
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((maintenance) => ({
        _id: maintenance._id,
        affectedMonitors: affectedMonitorNames(maintenance, monitors),
        endsAt: maintenance.endsAt,
        isActive: isMaintenanceActive(maintenance, now),
        message: maintenance.message,
        startsAt: maintenance.startsAt,
        title: maintenance.title,
      }));
  },
});

export const scheduleMaintenance = mutation({
  args: {
    affectedMonitorIds: v.array(v.id("statusMonitors")),
    endsAt: v.number(),
    message: v.optional(v.string()),
    organizationId: v.id("organizations"),
    startsAt: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "schedule maintenance");

    const title = args.title.trim();
    const message = args.message?.trim() || undefined;
    if (title === "") {
      throw new Error("Title is required");
    }
    validateInputLength(title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(message, MAX_DESCRIPTION_LENGTH, "Message");

    const now = Date.now();
    const startsAt = Math.max(args.startsAt, now);
    if (args.endsAt <= startsAt) {
      throw new Error("Maintenance must end after it starts");
    }

    const affectedMonitorIds = [...new Set(args.affectedMonitorIds)];
    for (const monitorId of affectedMonitorIds) {
      const monitor = await ctx.db.get(monitorId);
      if (monitor?.organizationId !== args.organizationId) {
        throw new Error("Monitor not found");
      }
    }

    const maintenance = {
      affectedMonitorIds,
      endsAt: args.endsAt,
      message,
      organizationId: args.organizationId,
      startsAt,
      title,
    };
    const maintenanceId = await ctx.db.insert("statusMaintenances", {
      ...maintenance,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAt(
      args.endsAt,
      internal.status.maintenances.closeMaintenanceWindow,
      { endsAt: args.endsAt, maintenanceId }
    );
    await announceToSubscribers(ctx, maintenance);
    return maintenanceId;
  },
});

/** An upcoming maintenance is cancelled outright; an active one ends now. */
export const cancelMaintenance = mutation({
  args: { maintenanceId: v.id("statusMaintenances") },
  handler: async (ctx, args) => {
    const maintenance = await ctx.db.get(args.maintenanceId);
    if (!maintenance) {
      throw new Error("Maintenance not found");
    }
    await requireOrgAdmin(
      ctx,
      maintenance.organizationId,
      "cancel maintenance"
    );

    const now = Date.now();
    if (maintenance.endsAt <= now) {
      throw new Error("Maintenance has already ended");
    }
    if (maintenance.startsAt > now) {
      await ctx.db.delete(args.maintenanceId);
      return null;
    }
    await ctx.db.patch(args.maintenanceId, { endsAt: now, updatedAt: now });
    await reportOutagesLeftByMaintenance(ctx, maintenance);
    return null;
  },
  returns: v.null(),
});

export const closeMaintenanceWindow = internalMutation({
  args: { endsAt: v.number(), maintenanceId: v.id("statusMaintenances") },
  handler: async (ctx, args) => {
    const maintenance = await ctx.db.get(args.maintenanceId);
    const closesAsScheduled = maintenance?.endsAt === args.endsAt;
    if (maintenance && closesAsScheduled) {
      await reportOutagesLeftByMaintenance(ctx, maintenance);
    }
    return null;
  },
  returns: v.null(),
});
