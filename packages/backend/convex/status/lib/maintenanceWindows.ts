import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

export const listUnfinishedMaintenances = (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  now: number
): Promise<Doc<"statusMaintenances">[]> =>
  ctx.db
    .query("statusMaintenances")
    .withIndex("by_org_ends", (q) =>
      q.eq("organizationId", organizationId).gt("endsAt", now)
    )
    .collect();

export const isMaintenanceActive = (
  maintenance: Doc<"statusMaintenances">,
  now: number
): boolean => maintenance.startsAt <= now && now < maintenance.endsAt;

export const listActiveMaintenances = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  now: number
): Promise<Doc<"statusMaintenances">[]> =>
  (await listUnfinishedMaintenances(ctx, organizationId, now)).filter(
    (maintenance) => isMaintenanceActive(maintenance, now)
  );

export const isUnderMaintenance = (
  activeMaintenances: Doc<"statusMaintenances">[],
  monitorId: Id<"statusMonitors">
): boolean =>
  activeMaintenances.some(
    ({ affectedMonitorIds }) =>
      affectedMonitorIds.length === 0 || affectedMonitorIds.includes(monitorId)
  );
