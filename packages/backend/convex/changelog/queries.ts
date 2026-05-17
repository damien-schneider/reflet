import { v } from "convex/values";
import { query } from "../_generated/server";
import { canReadRelease, resolveOrgReader } from "../shared/access";

// ============================================
// QUERIES
// ============================================

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

    const { isMember, canRead } = await resolveOrgReader(ctx, org);
    if (!canRead) {
      return [];
    }

    let releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (!isMember || args.publishedOnly) {
      releases = releases.filter((r) => r.publishedAt !== undefined);
    }

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

    const { isMember, canRead } = await canReadRelease(ctx, org, release);
    if (!canRead) {
      return null;
    }

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

    const publishedReleases = releases.filter(
      (r) => r.publishedAt !== undefined
    );

    publishedReleases.sort(
      (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
    );

    const releasesWithFeedback = await Promise.all(
      publishedReleases.map(async (release) => {
        const links = await ctx.db
          .query("releaseFeedback")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect();

        const feedback = await Promise.all(
          links.map(async (link) => {
            const f = await ctx.db.get(link.feedbackId);
            return f ? { _id: f._id, title: f.title, status: f.status } : null;
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
