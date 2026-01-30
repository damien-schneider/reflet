import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { PLAN_LIMITS } from "./organizations";
import { getAuthUser } from "./utils";

const siteUrl = process.env.SITE_URL ?? "";

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

/**
 * Invite a user to the organization
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to invite members");
    }

    // Get organization to check subscription limits
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check member limit
    const currentMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const pendingInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const totalPending = currentMembers.length + pendingInvitations.length;
    const limit = PLAN_LIMITS[org.subscriptionTier].maxMembers;

    if (totalPending >= limit) {
      throw new Error(
        `Member limit reached. Your ${org.subscriptionTier} plan allows ${limit} members.`
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email.toLowerCase()),
          q.eq(q.field("status"), "pending")
        )
      )
      .unique();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Create invitation (expires in 7 days)
    const invitationId = await ctx.db.insert("invitations", {
      organizationId: args.organizationId,
      email: args.email.toLowerCase(),
      role: args.role,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      inviterId: user._id,
      token,
    });

    // Get inviter's name from their user record
    const inviterName = user.name ?? user.email ?? "Un membre";

    // Build the invitation accept URL
    const acceptUrl = `${siteUrl}/invite/${token}`;

    // Schedule the invitation email
    await ctx.scheduler.runAfter(
      0,
      internal.email_renderer.sendInvitationEmail,
      {
        to: args.email.toLowerCase(),
        organizationName: org.name,
        inviterName,
        role: args.role,
        acceptUrl,
      }
    );

    return { invitationId, token };
  },
});

/**
 * Accept an invitation
 */
export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Get invitation
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been used or expired");
    }

    if (invitation.expiresAt < Date.now()) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this organization");
    }

    // Check member limit again
    const org = await ctx.db.get(invitation.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const currentMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", invitation.organizationId)
      )
      .collect();

    const limit = PLAN_LIMITS[org.subscriptionTier].maxMembers;
    if (currentMembers.length >= limit) {
      throw new Error(
        `Cannot join: organization has reached its member limit of ${limit}`
      );
    }

    // Create membership
    await ctx.db.insert("organizationMembers", {
      organizationId: invitation.organizationId,
      userId: user._id,
      role: invitation.role,
      createdAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return invitation.organizationId;
  },
});

/**
 * Cancel a pending invitation
 */
export const cancel = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to cancel invitations");
    }

    await ctx.db.delete(args.invitationId);
    return true;
  },
});

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * Resend invitation email
 */
export const resend = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer pending");
    }

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to resend invitations");
    }

    // Check cooldown
    const lastSent = invitation.lastSentAt ?? invitation.createdAt;
    const timeSinceLastSent = Date.now() - lastSent;

    if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000
      );
      throw new Error(
        `Please wait ${remainingSeconds} seconds before resending`
      );
    }

    // Get organization
    const org = await ctx.db.get(invitation.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get inviter's name
    const inviterName = user.name ?? user.email ?? "Un membre";

    // Build the invitation accept URL
    const acceptUrl = `${siteUrl}/invite/${invitation.token}`;

    // Update lastSentAt
    await ctx.db.patch(invitation._id, { lastSentAt: Date.now() });

    // Schedule the invitation email (invitations are only for admin/member roles)
    const emailRole = invitation.role as "admin" | "member";
    await ctx.scheduler.runAfter(
      0,
      internal.email_renderer.sendInvitationEmail,
      {
        to: invitation.email,
        organizationName: org.name,
        inviterName,
        role: emailRole,
        acceptUrl,
      }
    );

    return { success: true };
  },
});
