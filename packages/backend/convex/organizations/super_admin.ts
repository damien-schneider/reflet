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
      activeProSubscriptions: proSubscriptions.length,
      totalComments: allComments.length,
      totalFeedback: activeFeedback.length,
      totalOrganizations: organizations.length,
      totalUsers: uniqueUserIds.size,
      totalVotes: allVotes.length,
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
          createdAt: org.createdAt,
          feedbackCount: activeFeedbackCount,
          isPublic: org.isPublic,
          memberCount: members.length,
          name: org.name,
          slug: org.slug,
          subscriptionStatus: org.subscriptionStatus,
          subscriptionTier: org.subscriptionTier,
        };
      })
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

export const getTopVotedFeedback = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const limit = args.limit ?? 10;
    const allFeedback = await ctx.db.query("feedback").collect();
    const activeFeedback = allFeedback.filter((f) => !f.deletedAt);

    // Sort by vote count descending and take top N
    const topFeedback = activeFeedback
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, limit);

    // Batch fetch org names
    const orgIds = [...new Set(topFeedback.map((f) => f.organizationId))];
    const orgMap = new Map<string, string>();
    await Promise.all(
      orgIds.map(async (orgId) => {
        const org = await ctx.db.get(orgId);
        if (org) {
          orgMap.set(orgId, org.name);
        }
      })
    );

    return topFeedback.map((f) => ({
      _id: f._id,
      commentCount: f.commentCount,
      createdAt: f.createdAt,
      organizationName: orgMap.get(f.organizationId) ?? "Unknown",
      status: f.status,
      title: f.title,
      voteCount: f.voteCount,
    }));
  },
});

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const limit = args.limit ?? 20;

    // Use .order("desc") which orders by _creationTime, avoiding full table scan
    const recentActivity = await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(limit);

    // Batch fetch org names and user names
    const orgIds = [...new Set(recentActivity.map((a) => a.organizationId))];
    const userIds = [...new Set(recentActivity.map((a) => a.authorId))];

    const orgMap = new Map<string, string>();
    const userMap = new Map<string, string>();

    await Promise.all([
      ...orgIds.map(async (orgId) => {
        const org = await ctx.db.get(orgId);
        if (org) {
          orgMap.set(orgId, org.name);
        }
      }),
      ...userIds.map(async (userId) => {
        const userData = await authComponent.getAnyUserById(ctx, userId);
        if (userData) {
          userMap.set(userId, userData.name ?? userData.email ?? "Unknown");
        }
      }),
    ]);

    return recentActivity.map((a) => ({
      _id: a._id,
      action: a.action,
      createdAt: a.createdAt,
      details: a.details,
      organizationName: orgMap.get(a.organizationId) ?? "Unknown",
      userName: userMap.get(a.authorId) ?? "Unknown",
    }));
  },
});

export const getTrends = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    const [
      allFeedback,
      allMembers,
      allOrganizations,
      allVotes,
      allComments,
      allSubscriptions,
    ] = await Promise.all([
      ctx.db.query("feedback").collect(),
      ctx.db.query("organizationMembers").collect(),
      ctx.db.query("organizations").collect(),
      ctx.db.query("feedbackVotes").collect(),
      ctx.db.query("comments").collect(),
      ctx.db.query("subscriptions").collect(),
    ]);

    const recentFeedback = allFeedback.filter(
      (f) => !f.deletedAt && f.createdAt >= cutoff
    );
    const recentMembers = allMembers.filter((m) => m.createdAt >= cutoff);
    const recentOrgs = allOrganizations.filter((o) => o.createdAt >= cutoff);
    const recentVotes = allVotes.filter((v) => v.createdAt >= cutoff);
    const recentComments = allComments.filter((c) => c.createdAt >= cutoff);
    const recentSubscriptions = allSubscriptions.filter(
      (s) => s.createdAt >= cutoff
    );

    // Initialize day buckets
    const buckets = new Map<
      string,
      {
        feedback: number;
        users: number;
        organizations: number;
        votes: number;
        comments: number;
        subscriptions: number;
      }
    >();

    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      buckets.set(key, {
        comments: 0,
        feedback: 0,
        organizations: 0,
        subscriptions: 0,
        users: 0,
        votes: 0,
      });
    }

    const increment = (key: string, field: string) => {
      const bucket = buckets.get(key);
      if (bucket && field in bucket) {
        (bucket as Record<string, number>)[field] += 1;
      }
    };

    for (const f of recentFeedback) {
      increment(new Date(f.createdAt).toISOString().split("T")[0], "feedback");
    }
    for (const m of recentMembers) {
      increment(new Date(m.createdAt).toISOString().split("T")[0], "users");
    }
    for (const o of recentOrgs) {
      increment(
        new Date(o.createdAt).toISOString().split("T")[0],
        "organizations"
      );
    }
    for (const vote of recentVotes) {
      increment(new Date(vote.createdAt).toISOString().split("T")[0], "votes");
    }
    for (const c of recentComments) {
      increment(new Date(c.createdAt).toISOString().split("T")[0], "comments");
    }
    for (const s of recentSubscriptions) {
      increment(
        new Date(s.createdAt).toISOString().split("T")[0],
        "subscriptions"
      );
    }

    const sortedDays = [...buckets.keys()].sort();

    const empty = {
      comments: 0,
      feedback: 0,
      organizations: 0,
      subscriptions: 0,
      users: 0,
      votes: 0,
    };

    return sortedDays.map((date) => {
      const b = buckets.get(date) ?? empty;
      return {
        comments: b.comments,
        date,
        feedback: b.feedback,
        organizations: b.organizations,
        subscriptions: b.subscriptions,
        users: b.users,
        votes: b.votes,
      };
    });
  },
});

export const getRevenueSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx);

    const organizations = await ctx.db.query("organizations").collect();

    const freeOrgs = organizations.filter((o) => o.subscriptionTier === "free");
    const proOrgs = organizations.filter((o) => o.subscriptionTier === "pro");

    // Subscription status breakdown
    const statusBreakdown = new Map<string, number>();
    for (const org of organizations) {
      const status = org.subscriptionStatus;
      statusBreakdown.set(status, (statusBreakdown.get(status) ?? 0) + 1);
    }

    return {
      freeCount: freeOrgs.length,
      proCount: proOrgs.length,
      proOrganizations: proOrgs.map((o) => ({
        _id: o._id,
        createdAt: o.createdAt,
        name: o.name,
        slug: o.slug,
        subscriptionStatus: o.subscriptionStatus,
      })),
      statusBreakdown: [...statusBreakdown.entries()].map(
        ([status, count]) => ({
          count,
          status,
        })
      ),
    };
  },
});
