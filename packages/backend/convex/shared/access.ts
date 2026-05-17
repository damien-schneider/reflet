import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";

type AuthUser = Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>;

/**
 * Returns whether the current caller has membership in the org.
 * Returns false if there's no authenticated user.
 */
export const getOrgMembership = async (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"],
  user: AuthUser
): Promise<boolean> => {
  if (!user) {
    return false;
  }
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", user._id)
    )
    .unique();
  return !!membership;
};

/**
 * Returns whether the current user can read the given org.
 * Public orgs are readable by anyone; private orgs only by members.
 */
export const isOrgReader = async (
  ctx: QueryCtx,
  org: Doc<"organizations">
): Promise<boolean> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  const isMember = await getOrgMembership(ctx, org._id, user);
  return isMember || org.isPublic;
};

/**
 * Resolves membership + auth user once, exposing both flags so callers
 * can branch on member-only behavior without re-querying.
 */
export const resolveOrgReader = async (
  ctx: QueryCtx,
  org: Doc<"organizations">
): Promise<{ user: AuthUser; isMember: boolean; canRead: boolean }> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  const isMember = await getOrgMembership(ctx, org._id, user);
  return { user, isMember, canRead: isMember || org.isPublic };
};

/**
 * For changelog: published releases are visible to public-org guests,
 * unpublished releases require membership.
 */
export const canReadRelease = async (
  ctx: QueryCtx,
  org: Doc<"organizations">,
  release: Doc<"releases">
): Promise<{ user: AuthUser; isMember: boolean; canRead: boolean }> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  const isMember = await getOrgMembership(ctx, org._id, user);
  const canRead =
    isMember || (org.isPublic && release.publishedAt !== undefined);
  return { user, isMember, canRead };
};
