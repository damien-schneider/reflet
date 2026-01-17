import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * List releases for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    publishedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    // Non-members can only see public releases
    if (!(isMember || org.isPublic)) {
      return [];
    }

    let releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to published only for non-members or if requested
    if (!isMember || args.publishedOnly) {
      releases = releases.filter((r) => r.publishedAt !== undefined);
    }

    // Sort by publishedAt (published first, then by createdAt for drafts)
    releases.sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return b.publishedAt - a.publishedAt;
      }
      if (a.publishedAt) {
        return -1;
      }
      if (b.publishedAt) {
        return 1;
      }
      return b.createdAt - a.createdAt;
    });

    return releases;
  },
});

/**
 * Get a single release with linked feedback
 */
export const get = query({
  args: { id: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.id);
    if (!release) {
      return null;
    }

    const org = await ctx.db.get(release.organizationId);
    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", release.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
    }

    // Non-members can only see published releases in public orgs
    if (!(isMember || (org.isPublic && release.publishedAt))) {
      return null;
    }

    // Get linked feedback
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.id))
      .collect();

    const feedbackItems = await Promise.all(
      links.map(async (link) => {
        const feedback = await ctx.db.get(link.feedbackId);
        if (!feedback) {
          return null;
        }

        // Get tags for this feedback
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();

        const tags = await Promise.all(
          feedbackTags.map((ft) => ctx.db.get(ft.tagId))
        );

        return {
          ...feedback,
          tags: tags.filter(Boolean),
        };
      })
    );

    return {
      ...release,
      organization: org,
      feedbackItems: feedbackItems.filter(Boolean),
      isMember,
    };
  },
});

/**
 * Get completed feedback that can be added to releases
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

/**
 * Check if user is subscribed to changelog
 */
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

/**
 * List only published releases for public changelog page
 */
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
            return f ? { _id: f._id, title: f.title } : null;
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
