import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

/**
 * List pending invitations for an organization
 */
export const listPending = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Verify user has admin/owner role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get pending invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return invitations;
  },
});

/**
 * List pending invitations for the current user (by email)
 */
export const listMyPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.email) {
      return [];
    }

    const now = Date.now();
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .collect();

    // Fetch organization names for each invitation
    const invitationsWithOrg = await Promise.all(
      invitations.map(async (invitation) => {
        const org = await ctx.db.get(invitation.organizationId);
        return {
          ...invitation,
          organizationName: org?.name ?? "Unknown",
          organizationLogo: org?.logo,
        };
      })
    );

    return invitationsWithOrg;
  },
});

/**
 * Get invitation by token (for accepting)
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      return null;
    }

    // Get organization name
    const org = await ctx.db.get(invitation.organizationId);
    if (!org) {
      return null;
    }

    return {
      ...invitation,
      organizationName: org.name,
    };
  },
});
