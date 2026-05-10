/**
 * Shared mutation helpers — org admin verification for public mutations.
 */

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getEffectiveTier } from "../../billing/effective_tier";

const AUTOPILOT_ACCESS_ERROR = "Autopilot requires a Pro subscription.";

export const requireOrgAdmin = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: string
) => {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  if (membership.role !== "admin" && membership.role !== "owner") {
    throw new Error("Admin or owner role required");
  }

  return membership;
};

export const requireAutopilotAccess = async (
  ctx: Pick<MutationCtx, "db" | "runQuery">,
  organizationId: Id<"organizations">
): Promise<void> => {
  const tier = await getEffectiveTier(ctx, organizationId);
  if (tier !== "pro") {
    throw new Error(AUTOPILOT_ACCESS_ERROR);
  }
};
