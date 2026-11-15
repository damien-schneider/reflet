import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const getOrgMembership = (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  userId: string
): Promise<Doc<"organizationMembers"> | null> =>
  ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

export const isOrgAdmin = (role: string | undefined): boolean =>
  role === "admin" || role === "owner";

export const orgAdminIdsExcept = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  excludedUserId: string | undefined
): Promise<string[]> => {
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  return members
    .filter(
      (member) => isOrgAdmin(member.role) && member.userId !== excludedUserId
    )
    .map((member) => member.userId);
};
