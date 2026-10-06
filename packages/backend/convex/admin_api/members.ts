import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { inviteToOrganization } from "../organizations/invitations";
import { API_ACTOR_ID } from "../shared/actors";

// ============================================
// MEMBER QUERIES
// ============================================

export const listMembers = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return members.map((m) => ({
      createdAt: m.createdAt,
      id: m._id,
      role: m.role,
      userId: m.userId,
    }));
  },
});

export const listInvitations = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return invitations.map((inv) => ({
      createdAt: inv.createdAt,
      email: inv.email,
      expiresAt: inv.expiresAt,
      id: inv._id,
      role: inv.role,
      status: inv.status,
    }));
  },
});

// ============================================
// INVITATION MUTATIONS
// ============================================

/** A leaked secret key must not be able to mint admins, so the API only invites members. */
export const createInvitation = internalMutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    const { invitationId } = await inviteToOrganization(ctx, {
      email: args.email,
      inviter: { _id: API_ACTOR_ID, name: `${org.name} API` },
      organizationId: args.organizationId,
      role: "member",
    });
    return { id: invitationId };
  },
  returns: v.object({ id: v.id("invitations") }),
});

export const cancelInvitation = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.organizationId !== args.organizationId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only cancel pending invitations");
    }

    await ctx.db.delete(args.invitationId);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
