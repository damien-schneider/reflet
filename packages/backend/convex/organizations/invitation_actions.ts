import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { PLAN_LIMITS } from "./queries";

const siteUrl = process.env.SITE_URL ?? "";

/**
 * List pending invitations for an organization
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
      createdAt: Date.now(),
      organizationId: invitation.organizationId,
      role: invitation.role,
      userId: user._id,
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return invitation.organizationId;
  },
});

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
      internal.email.renderer.sendInvitationEmail,
      {
        acceptUrl,
        inviterName,
        organizationName: org.name,
        role: emailRole,
        to: invitation.email,
      }
    );

    return { success: true };
  },
});
