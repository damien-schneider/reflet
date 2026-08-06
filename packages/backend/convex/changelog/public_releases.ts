import { v } from "convex/values";
import { query } from "../_generated/server";
import { authComponent } from "../auth/auth";

/**
 * List releases for an organization
 */
export const getCompletedFeedback = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      return [];
    }

    // Get completed feedback
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Get already linked feedback IDs
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const linkedFeedbackIds = new Set<string>();
    for (const release of releases) {
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect();
      for (const link of links) {
        linkedFeedbackIds.add(link.feedbackId);
      }
    }

    // Filter out already linked feedback
    return feedback.filter((f) => !linkedFeedbackIds.has(f._id));
  },
});

export const isSubscribed = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return false;
    }

    const subscription = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .unique();

    return !!subscription;
  },
});

export const listPublished = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to published only
    const publishedReleases = releases.filter(
      (r) => r.publishedAt !== undefined
    );

    // Sort by publishedAt descending
    publishedReleases.sort(
      (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
    );

    // Add feedback items for each release
    const releasesWithFeedback = await Promise.all(
      publishedReleases.map(async (release) => {
        const links = await ctx.db
          .query("releaseFeedback")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect();

        const feedback = await Promise.all(
          links.map(async (link) => {
            const f = await ctx.db.get(link.feedbackId);
            return f ? { _id: f._id, status: f.status, title: f.title } : null;
          })
        );

        return {
          ...release,
          content: release.description || "",
          feedback: feedback.filter(Boolean),
        };
      })
    );

    return releasesWithFeedback;
  },
});

/**
 * Parse a semver string into numeric parts for comparison
 */
