import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

const VERSION_PREFIX_REGEX = /^v/i;

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

/**
 * Parse a semver string into numeric parts for comparison
 */
const parseSemver = (
  version: string
): { major: number; minor: number; patch: number } => {
  const stripped = version.replace(VERSION_PREFIX_REGEX, "");
  const parts = stripped.split(".");
  return {
    major: Number.parseInt(parts[0] ?? "0", 10) || 0,
    minor: Number.parseInt(parts[1] ?? "0", 10) || 0,
    patch: Number.parseInt(parts[2] ?? "0", 10) || 0,
  };
};

/**
 * Compare two semver objects. Returns negative if a < b, positive if a > b, 0 if equal.
 */
const compareSemver = (
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number }
): number => {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
};

/**
 * Get the next version suggestions based on all published releases.
 * Pass excludeReleaseId when editing a release so it doesn't count itself
 * as the "latest" — this prevents infinite incrementing.
 */
export const getNextVersion = query({
  args: {
    organizationId: v.id("organizations"),
    excludeReleaseId: v.optional(v.id("releases")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return {
        current: null,
        patch: null,
        minor: null,
        major: null,
        autoVersioning: true,
        defaultIncrement: "patch" as const,
      };
    }

    const settings = org.changelogSettings;
    const autoVersioning = settings?.autoVersioning !== false;
    const defaultIncrement =
      (settings?.versionIncrement as "patch" | "minor" | "major") ?? "patch";
    const prefix = settings?.versionPrefix ?? "v";

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to published releases with versions, excluding the release being edited
    const publishedWithVersion = releases.filter(
      (r) =>
        r.publishedAt !== undefined &&
        r.version &&
        r._id !== args.excludeReleaseId
    );

    if (publishedWithVersion.length === 0) {
      return {
        current: null,
        patch: `${prefix}0.0.1`,
        minor: `${prefix}0.1.0`,
        major: `${prefix}1.0.0`,
        autoVersioning,
        defaultIncrement,
      };
    }

    // Sort by actual semver value (highest first) for robust ordering
    publishedWithVersion.sort((a, b) => {
      const semA = parseSemver(a.version ?? "");
      const semB = parseSemver(b.version ?? "");
      return compareSemver(semB, semA);
    });

    const latestVersion = publishedWithVersion[0]?.version ?? "";
    const { major, minor, patch } = parseSemver(latestVersion);

    return {
      current: latestVersion,
      patch: `${prefix}${major}.${minor}.${patch + 1}`,
      minor: `${prefix}${major}.${minor + 1}.0`,
      major: `${prefix}${major + 1}.0.0`,
      autoVersioning,
      defaultIncrement,
    };
  },
});
