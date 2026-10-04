import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { notifyIncidentChange } from "../incidentNotifications";
import { listActiveIncidents } from "./activeIncidents";
import {
  isUnderMaintenance,
  listActiveMaintenances,
} from "./maintenanceWindows";

export const openOutageIncident = async (
  ctx: MutationCtx,
  monitor: Doc<"statusMonitors">
): Promise<void> => {
  const now = Date.now();
  const activeMaintenances = await listActiveMaintenances(
    ctx,
    monitor.organizationId,
    now
  );
  if (isUnderMaintenance(activeMaintenances, monitor._id)) {
    return;
  }
  const activeIncidents = await listActiveIncidents(
    ctx,
    monitor.organizationId
  );
  const alreadyReported = activeIncidents.some((incident) =>
    incident.affectedMonitorIds.includes(monitor._id)
  );
  if (alreadyReported) {
    return;
  }

  const incidentId = await ctx.db.insert("statusIncidents", {
    affectedMonitorIds: [monitor._id],
    autoDetected: true,
    createdAt: now,
    organizationId: monitor.organizationId,
    severity: "major",
    startedAt: now,
    status: "investigating",
    title: `${monitor.name} is experiencing issues`,
    updatedAt: now,
  });
  const updateId = await ctx.db.insert("statusIncidentUpdates", {
    createdAt: now,
    incidentId,
    message: `Automated monitoring detected that ${monitor.name} is not responding. We are investigating the issue.`,
    organizationId: monitor.organizationId,
    status: "investigating",
  });
  await notifyIncidentChange(ctx, { incidentId, updateId });
};

export const resolveOutageIncident = async (
  ctx: MutationCtx,
  monitor: Doc<"statusMonitors">
): Promise<void> => {
  const activeIncidents = await listActiveIncidents(
    ctx,
    monitor.organizationId
  );
  const outageIncident = activeIncidents.find(
    (incident) =>
      incident.autoDetected && incident.affectedMonitorIds.includes(monitor._id)
  );
  if (!outageIncident) {
    return;
  }

  const now = Date.now();
  await ctx.db.patch(outageIncident._id, {
    resolvedAt: now,
    status: "resolved",
    updatedAt: now,
  });
  const updateId = await ctx.db.insert("statusIncidentUpdates", {
    createdAt: now,
    incidentId: outageIncident._id,
    message: `${monitor.name} has recovered and is now operational.`,
    organizationId: monitor.organizationId,
    status: "resolved",
  });
  await notifyIncidentChange(ctx, {
    incidentId: outageIncident._id,
    updateId,
  });
};
