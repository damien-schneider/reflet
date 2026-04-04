/**
 * Shared mutation helpers — org admin verification for public mutations.
 */

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

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
