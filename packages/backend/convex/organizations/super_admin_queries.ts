import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

const getSuperAdminEmails = (): string[] => {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

const assertSuperAdmin = async (
  ctx: Parameters<typeof getAuthUser>[0]
): Promise<{ _id: string; email: string; name: string }> => {
  const user = await getAuthUser(ctx);
  const allowedEmails = getSuperAdminEmails();
  if (!allowedEmails.includes(user.email.toLowerCase())) {
    throw new Error("Not authorized");
  }
  return user;
};

export const isSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }
    const allowedEmails = getSuperAdminEmails();
    return allowedEmails.includes(user.email.toLowerCase());
  },
});

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
      totalUsers: uniqueUserIds.size,
      totalOrganizations: organizations.length,
      totalFeedback: activeFeedback.length,
      activeProSubscriptions: proSubscriptions.length,
      totalVotes: allVotes.length,
      totalComments: allComments.length,
    };
  },
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
          id: userId,
          name: userData?.name ?? "Unknown",
          email: userData?.email ?? "Unknown",
          image: userData?.image ?? null,
          organizationCount: stats?.count ?? 0,
          joinedAt: stats?.earliestJoin ?? 0,
        };
      })
    );

    return {
      items: users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },
});

export const listOrganizations = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const result = await ctx.db
      .query("organizations")
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich each page item with member/feedback counts via indexed queries
    const enrichedPage = await Promise.all(
      result.page.map(async (org) => {
        const [members, feedback] = await Promise.all([
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
        ]);

        const activeFeedbackCount = feedback.filter((f) => !f.deletedAt).length;

        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          subscriptionTier: org.subscriptionTier,
          subscriptionStatus: org.subscriptionStatus,
          isPublic: org.isPublic,
          createdAt: org.createdAt,
          memberCount: members.length,
          feedbackCount: activeFeedbackCount,
        };
      })
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});
