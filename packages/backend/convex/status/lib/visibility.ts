import type { Infer } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { isOrgMemberViewer } from "../../shared/access";
import type { monitorStatus } from "../tableFields";
import { isUnderMaintenance } from "./maintenanceWindows";

export type MonitorDisplayStatus = Infer<typeof monitorStatus> | "maintenance";

export type OverallStatus =
  | "operational"
  | "degraded"
  | "major_outage"
  | "maintenance";

const OVERALL_STATUS_BY_PRIORITY: Exclude<OverallStatus, "operational">[] = [
  "major_outage",
  "degraded",
  "maintenance",
];

/** The status page follows the organization's visibility, like every other public page; members can always preview it. */
export const canViewStatusPage = async (
  ctx: QueryCtx,
  organization: Doc<"organizations">
): Promise<boolean> =>
  organization.isPublic || (await isOrgMemberViewer(ctx, organization._id));

export const isShownOnStatusPage = (monitor: Doc<"statusMonitors">): boolean =>
  monitor.isPublic && monitor.status !== "paused";

/** Planned downtime is announced as maintenance whatever the checks of an affected monitor say. */
export const withMaintenanceStatus = (
  monitors: Doc<"statusMonitors">[],
  activeMaintenances: Doc<"statusMaintenances">[]
): (Omit<Doc<"statusMonitors">, "status"> & {
  status: MonitorDisplayStatus;
})[] =>
  monitors.map((monitor) => ({
    ...monitor,
    status: isUnderMaintenance(activeMaintenances, monitor._id)
      ? "maintenance"
      : monitor.status,
  }));

export const overallStatusOf = (
  shownMonitors: { status: MonitorDisplayStatus }[]
): OverallStatus =>
  OVERALL_STATUS_BY_PRIORITY.find((status) =>
    shownMonitors.some((monitor) => monitor.status === status)
  ) ?? "operational";

/** Org-wide incidents and maintenances (no monitors) are announcements; others need a public monitor. */
export const isPublicNotice = (
  notice: { affectedMonitorIds: Id<"statusMonitors">[] },
  publicMonitorIds: Set<Id<"statusMonitors">>
): boolean =>
  notice.affectedMonitorIds.length === 0 ||
  notice.affectedMonitorIds.some((id) => publicMonitorIds.has(id));

export const affectedMonitorNames = (
  notice: { affectedMonitorIds: Id<"statusMonitors">[] },
  monitors: { _id: Id<"statusMonitors">; name: string }[]
): string[] =>
  monitors
    .filter((monitor) => notice.affectedMonitorIds.includes(monitor._id))
    .map((monitor) => monitor.name);
