/**
 * Shared query helpers — org membership verification for public queries.
 */

import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

export const requireOrgMembership = async (
  ctx: QueryCtx,
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

  return membership;
};
