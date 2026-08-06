import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";
import { PLAN_LIMITS } from "./queries";

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
          organizationLogo: org?.logo,
          organizationName: org?.name ?? "Unknown",
        };
      })
    );

    return invitationsWithOrg;
  },
});

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

export const create = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
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

    // Check if email already belongs to an existing member
    const normalizedEmail = args.email.toLowerCase();
    for (const member of currentMembers) {
      const memberUser = await authComponent.getAnyUserById(ctx, member.userId);
      if (memberUser?.email?.toLowerCase() === normalizedEmail) {
        throw new Error("This person is already a member of this organization");
      }
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Create invitation (expires in 7 days)
    const invitationId = await ctx.db.insert("invitations", {
      createdAt: Date.now(),
      email: args.email.toLowerCase(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      inviterId: user._id,
      organizationId: args.organizationId,
      role: args.role,
      status: "pending",
      token,
    });

    // Get inviter's name from their user record
    const inviterName = user.name ?? user.email ?? "Un membre";

    // Build the invitation accept URL
    const acceptUrl = `${siteUrl}/invite/${token}`;

    // Schedule the invitation email
    await ctx.scheduler.runAfter(
      0,
      internal.email.renderer.sendInvitationEmail,
      {
        acceptUrl,
        inviterName,
        organizationName: org.name,
        role: args.role,
        to: args.email.toLowerCase(),
      }
    );

    return { invitationId, token };
  },
});
