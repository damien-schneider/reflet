import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import { normalizeEmail } from "../email/suppression";
import { requireAuthUser } from "../shared/access";
import { scheduleInvitationEmail } from "./invitations";

// Deployments that skip email verification never set emailVerified for password sign-ups.
const emailVerificationRequired =
  process.env.SKIP_EMAIL_VERIFICATION !== "true";

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

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
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    if (normalizeEmail(user.email) !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }
    if (emailVerificationRequired && !user.emailVerified) {
      throw new Error("Verify your email address to accept this invitation");
    }

    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this organization");
    }

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

    const tier = await getOrgTier(ctx, org._id);
    const limit = PLAN_LIMITS[tier].maxMembers;
    if (currentMembers.length >= limit) {
      throw new Error(
        `Cannot join: organization has reached its member limit of ${limit}`
      );
    }

    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: invitation.organizationId,
      role: invitation.role,
      userId: user._id,
    });

    await ctx.db.patch(invitation._id, { status: "accepted" });

    return invitation.organizationId;
  },
});

export const cancel = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

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
    const user = await requireAuthUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer pending");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("You don't have permission to resend invitations");
    }

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

    const org = await ctx.db.get(invitation.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(invitation._id, { lastSentAt: Date.now() });
    await scheduleInvitationEmail(ctx, {
      invitation,
      inviter: user,
      organizationName: org.name,
    });

    return { success: true };
  },
});
