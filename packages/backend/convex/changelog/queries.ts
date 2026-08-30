import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { isOrgMemberViewer } from "../shared/access";
import {
  compareSemver,
  isVersionIncrement,
  nextVersions,
  parseSemver,
} from "./semver";

async function withLinkedFeedback(
  ctx: QueryCtx,
  releaseId: Id<"releases">
): Promise<{ _id: Id<"feedback">; status: string; title: string }[]> {
  const links = await ctx.db
    .query("releaseFeedback")
    .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
    .collect();

  const feedback = await Promise.all(
    links.map(async (link) => {
      const item = await ctx.db.get(link.feedbackId);
      return item
        ? { _id: item._id, status: item.status, title: item.title }
        : null;
    })
  );

  return feedback.filter((item) => item !== null);
}

function byPublishedDesc(
  a: { createdAt: number; publishedAt?: number },
  b: { createdAt: number; publishedAt?: number }
): number {
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
}

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

    const isMember = await isOrgMemberViewer(ctx, args.organizationId);

    if (!(isMember || org.isPublic)) {
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

    releases.sort(byPublishedDesc);

    return await Promise.all(
      releases.map(async (release) => {
        const feedback = await withLinkedFeedback(ctx, release._id);

        let commitCount = 0;
        if (isMember) {
          const commitsDoc = await ctx.db
            .query("releaseCommits")
            .withIndex("by_release", (q) => q.eq("releaseId", release._id))
            .first();
          commitCount = commitsDoc?.commits?.length ?? 0;
        }

        return { ...release, commitCount, feedback };
      })
    );
  },
});

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

    const isMember = await isOrgMemberViewer(ctx, release.organizationId);

    if (!(isMember || (org.isPublic && release.publishedAt))) {
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

        return { ...feedback, tags: tags.filter((tag) => tag !== null) };
      })
    );

    return {
      ...release,
      feedbackItems: feedbackItems.filter((item) => item !== null),
      isMember,
      organization: org,
    };
  },
});

export const listPublished = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    if (
      !(org.isPublic || (await isOrgMemberViewer(ctx, args.organizationId)))
    ) {
      return [];
    }

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const publishedReleases = releases
      .filter((r) => r.publishedAt !== undefined)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

    return await Promise.all(
      publishedReleases.map(async (release) => ({
        ...release,
        content: release.description || "",
        feedback: await withLinkedFeedback(ctx, release._id),
      }))
    );
  },
});

export const getNextVersion = query({
  args: {
    excludeReleaseId: v.optional(v.id("releases")),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return {
        autoVersioning: true,
        current: null,
        defaultIncrement: "patch" as const,
        major: null,
        minor: null,
        patch: null,
      };
    }

    const settings = org.changelogSettings;
    const autoVersioning = settings?.autoVersioning !== false;
    const defaultIncrement = isVersionIncrement(settings?.versionIncrement)
      ? settings.versionIncrement
      : "patch";
    const prefix = settings?.versionPrefix ?? "v";

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const publishedWithVersion = releases.filter(
      (r) =>
        r.publishedAt !== undefined &&
        r.version &&
        r._id !== args.excludeReleaseId
    );

    if (publishedWithVersion.length === 0) {
      return {
        autoVersioning,
        current: null,
        defaultIncrement,
        ...nextVersions({ major: 0, minor: 0, patch: 0 }, prefix),
      };
    }

    publishedWithVersion.sort((a, b) =>
      compareSemver(parseSemver(b.version ?? ""), parseSemver(a.version ?? ""))
    );

    const latestVersion = publishedWithVersion[0]?.version ?? "";

    return {
      autoVersioning,
      current: latestVersion,
      defaultIncrement,
      ...nextVersions(parseSemver(latestVersion), prefix),
    };
  },
});
