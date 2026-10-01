import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import { normalizeEmail } from "../email/suppression";
import { type AuthUser, requireOrgAdmin } from "../shared/access";
import { rateLimiter } from "../shared/rate_limits";
import { isValidEmail } from "../shared/validators";

const siteUrl = process.env.SITE_URL ?? "";
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const listPending = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

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

const assertInvitationSlotAvailable = async (
  ctx: MutationCtx,
  options: { email: string; org: Doc<"organizations"> }
): Promise<void> => {
  const { email, org } = options;
  const currentMembers = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
    .collect();
  const pendingInvitations = await ctx.db
    .query("invitations")
    .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();

  const tier = await getOrgTier(ctx, org._id);
  const limit = PLAN_LIMITS[tier].maxMembers;
  if (currentMembers.length + pendingInvitations.length >= limit) {
    throw new Error(
      `Member limit reached. Your ${tier} plan allows ${limit} members.`
    );
  }

  if (pendingInvitations.some((invitation) => invitation.email === email)) {
    throw new Error("An invitation has already been sent to this email");
  }

  for (const member of currentMembers) {
    const memberUser = await authComponent.getAnyUserById(ctx, member.userId);
    if (memberUser?.email?.toLowerCase() === email) {
      throw new Error("This person is already a member of this organization");
    }
  }
};

export const scheduleInvitationEmail = async (
  ctx: MutationCtx,
  options: {
    invitation: Pick<
      Doc<"invitations">,
      "email" | "organizationId" | "role" | "token"
    >;
    inviter: AuthUser;
    organizationName: string;
  }
): Promise<void> => {
  const { invitation, inviter, organizationName } = options;
  if (invitation.role === "owner") {
    throw new Error("Owner invitations are not supported");
  }
  await rateLimiter.limit(ctx, "invitationEmailPerOrg", {
    key: invitation.organizationId,
    throws: true,
  });
  await rateLimiter.limit(ctx, "invitationEmailPerUser", {
    key: inviter._id,
    throws: true,
  });

  const suppressed = await ctx.runQuery(
    internal.email.suppression.isEmailSuppressed,
    { email: invitation.email }
  );
  if (suppressed) {
    return;
  }

  await ctx.scheduler.runAfter(0, internal.email.renderer.sendInvitationEmail, {
    acceptUrl: `${siteUrl}/invite/${invitation.token}`,
    inviterName: inviter.name ?? inviter.email ?? "Un membre",
    organizationName,
    role: invitation.role,
    to: invitation.email,
  });
};

export const create = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { membership, user } = await requireOrgAdmin(
      ctx,
      args.organizationId,
      "invite members"
    );
    if (args.role === "admin" && membership.role !== "owner") {
      throw new Error("Only the owner can invite admins");
    }

    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new Error("Invalid email address");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    await assertInvitationSlotAvailable(ctx, { email, org });

    const invitation = {
      email,
      organizationId: args.organizationId,
      role: args.role,
      token: crypto.randomUUID(),
    };
    const now = Date.now();
    const invitationId = await ctx.db.insert("invitations", {
      ...invitation,
      createdAt: now,
      expiresAt: now + INVITATION_TTL_MS,
      inviterId: user._id,
      status: "pending",
    });

    await scheduleInvitationEmail(ctx, {
      invitation,
      inviter: user,
      organizationName: org.name,
    });

    return { invitationId, token: invitation.token };
  },
  returns: v.object({
    invitationId: v.id("invitations"),
    token: v.string(),
  }),
});
