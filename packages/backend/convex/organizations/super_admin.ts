import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgSubscription, planTierFor } from "../billing/org_subscription";
import { assertSuperAdmin } from "../shared/access";
import { subscriptionTier } from "../shared/validators";

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx);

    const [organizations, allFeedback, allVotes, allComments, allMembers] =
      await Promise.all([
        ctx.db.query("organizations").collect(),
        ctx.db.query("feedback").collect(),
        ctx.db.query("feedbackVotes").collect(),
        ctx.db.query("comments").collect(),
        ctx.db.query("organizationMembers").collect(),
      ]);

    const activeFeedback = allFeedback.filter((f) => !f.deletedAt);
    const uniqueUserIds = new Set(allMembers.map((m) => m.userId));
    const proSubscriptions = organizations.filter(
      (o) => o.subscriptionTier === "pro" && o.subscriptionStatus === "active"
    );

    return {
      activeProSubscriptions: proSubscriptions.length,
      totalComments: allComments.length,
      totalFeedback: activeFeedback.length,
      totalOrganizations: organizations.length,
      totalUsers: uniqueUserIds.size,
      totalVotes: allVotes.length,
    };
  },
  returns: v.object({
    activeProSubscriptions: v.number(),
    totalComments: v.number(),
    totalFeedback: v.number(),
    totalOrganizations: v.number(),
    totalUsers: v.number(),
    totalVotes: v.number(),
  }),
});

export const listUsers = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const page = args.page ?? 0;
    const pageSize = args.pageSize ?? 20;
    const offset = page * pageSize;

    const allMembers = await ctx.db.query("organizationMembers").collect();

    // Group memberships by userId, track count and earliest join date
    const userStats = new Map<
      string,
      { count: number; earliestJoin: number }
    >();
    for (const member of allMembers) {
      const existing = userStats.get(member.userId);
      if (existing) {
        existing.count += 1;
        existing.earliestJoin = Math.min(
          existing.earliestJoin,
          member.createdAt
        );
      } else {
        userStats.set(member.userId, {
          count: 1,
          earliestJoin: member.createdAt,
        });
      }
    }

    // Sort all user IDs by earliest join date desc
    const sortedUserIds = [...userStats.entries()]
      .sort((a, b) => b[1].earliestJoin - a[1].earliestJoin)
      .map(([id]) => id);

    const totalCount = sortedUserIds.length;
    const pageUserIds = sortedUserIds.slice(offset, offset + pageSize);

    // Only look up users for this page
    const users = await Promise.all(
      pageUserIds.map(async (userId) => {
        const userData = await authComponent.getAnyUserById(ctx, userId);
        const stats = userStats.get(userId);
        return {
          email: userData?.email ?? "Unknown",
          id: userId,
          image: userData?.image ?? null,
          joinedAt: stats?.earliestJoin ?? 0,
          name: userData?.name ?? "Unknown",
          organizationCount: stats?.count ?? 0,
        };
      })
    );

    return {
      items: users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },
  returns: v.object({
    items: v.array(
      v.object({
        email: v.string(),
        id: v.string(),
        image: v.union(v.string(), v.null()),
        joinedAt: v.number(),
        name: v.string(),
        organizationCount: v.number(),
      })
    ),
    totalCount: v.number(),
    totalPages: v.number(),
  }),
});

export const listOrganizations = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const result = await ctx.db
      .query("organizations")
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (org) => {
        const [members, feedback, subscription] = await Promise.all([
          ctx.db
            .query("organizationMembers")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", org._id)
            )
            .collect(),
          ctx.db
            .query("feedback")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", org._id)
            )
            .collect(),
          getOrgSubscription(ctx, org._id),
        ]);

        const activeFeedbackCount = feedback.filter((f) => !f.deletedAt).length;

        return {
          _id: org._id,
          createdAt: org.createdAt,
          customDomain: org.customDomain,
          feedbackCount: activeFeedbackCount,
          isPublic: org.isPublic,
          memberCount: members.length,
          name: org.name,
          slug: org.slug,
          stripeCustomerId: org.stripeCustomerId,
          subscriptionStatus: subscription?.status ?? "none",
          subscriptionTier: planTierFor(subscription),
        };
      })
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
  returns: paginationResultValidator(
    v.object({
      _id: v.id("organizations"),
      createdAt: v.number(),
      customDomain: v.optional(v.string()),
      feedbackCount: v.number(),
      isPublic: v.boolean(),
      memberCount: v.number(),
      name: v.string(),
      slug: v.string(),
      stripeCustomerId: v.optional(v.string()),
      subscriptionStatus: v.string(),
      subscriptionTier,
    })
  ),
});
