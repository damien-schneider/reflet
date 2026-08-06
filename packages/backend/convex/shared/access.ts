import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgMembership, isOrgAdmin } from "./membership";

export type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>
>;

export interface OrgAccess {
  isAdmin: boolean;
  membership: Doc<"organizationMembers">;
  user: AuthUser;
}

export const requireAuthUser = async (ctx: QueryCtx): Promise<AuthUser> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

export const requireOrgMember = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<OrgAccess> => {
  const user = await requireAuthUser(ctx);
  const membership = await getOrgMembership(ctx, organizationId, user._id);
  if (!membership) {
    throw new Error("You don't have access to this organization");
  }
  return { isAdmin: isOrgAdmin(membership.role), membership, user };
};

export const requireOrgAdmin = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  action: string
): Promise<OrgAccess> => {
  const access = await requireOrgMember(ctx, organizationId);
  if (!access.isAdmin) {
    throw new Error(`Only admins can ${action}`);
  }
  return access;
};

/** Membership lookup for actions, which have no database handle of their own. */
export const membershipForUser = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
  },
  handler: async (ctx, args) =>
    await getOrgMembership(ctx, args.organizationId, args.userId),
});

export const isOrgMemberViewer = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<boolean> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    return false;
  }
  return (await getOrgMembership(ctx, organizationId, user._id)) !== null;
};
