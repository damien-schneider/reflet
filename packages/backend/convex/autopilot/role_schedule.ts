/**
 * Role-skill schedule function path for heartbeat and chain runtime UI.
 *
 * The implementation lives under `schedule/` so signal collection, policy
 * checks, and Convex validators remain small and independently testable.
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { requireOrgMembership } from "./queries/auth";
import { computeRoleSchedule } from "./schedule/build";
import { roleScheduleEntryValidator } from "./schedule/types";

export const getRoleSchedule = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(roleScheduleEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    return await computeRoleSchedule(ctx, args.organizationId);
  },
});

export const getRoleScheduleInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(roleScheduleEntryValidator),
  handler: async (ctx, args) => {
    return await computeRoleSchedule(ctx, args.organizationId);
  },
});
