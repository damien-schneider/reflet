import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const createInvitation = internalMutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    // Check if email is already a pending invitation
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("An invitation for this email is already pending");
    }

    const now = Date.now();
    const token = crypto.randomUUID();

    const id = await ctx.db.insert("invitations", {
      createdAt: now,
      email: args.email,
      expiresAt: now + INVITATION_EXPIRY_MS,
      inviterId: "api", // API-created invitation
      organizationId: args.organizationId,
      role: args.role,
      status: "pending",
      token,
    });

    return { id };
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
