import type { Infer } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { incidentStatus } from "../tableFields";

const ACTIVE_INCIDENT_STATUSES: Exclude<
  Infer<typeof incidentStatus>,
  "resolved"
>[] = ["investigating", "identified", "monitoring"];

export const listActiveIncidents = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) => {
  const incidentsByStatus = await Promise.all(
    ACTIVE_INCIDENT_STATUSES.map((status) =>
      ctx.db
        .query("statusIncidents")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .collect()
    )
  );
  return incidentsByStatus.flat();
};
