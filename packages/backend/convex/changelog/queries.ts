import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { getFeedbackCategories } from "../feedback/categories/visibility";
import { isFeedbackPubliclyVisible } from "../feedback/public_projection";
import { isOrgMemberViewer } from "../shared/access";
import { releaseSourceDate } from "./release_lifecycle";
import {
  compareSemver,
  isVersionIncrement,
  nextVersions,
  parseSemver,
  type SemverParts,
} from "./semver";

const MAX_PUBLIC_RELEASES = 100;

function highestVersion(
  versions: string[]
): { parts: SemverParts; version: string } | null {
  let highest: { parts: SemverParts; version: string } | null = null;
  for (const version of versions) {
    const parts = parseSemver(version);
    if (parts && (!highest || compareSemver(parts, highest.parts) > 0)) {
      highest = { parts, version };
    }
  }
  return highest;
}

async function withLinkedFeedback(
  ctx: QueryCtx,
  options: {
    isMember: boolean;
    org: Doc<"organizations">;
    releaseId: Id<"releases">;
  }
): Promise<{ _id: Id<"feedback">; status: string; title: string }[]> {
  const { isMember, org, releaseId } = options;
  const links = await ctx.db
    .query("releaseFeedback")
    .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
    .collect();

  const feedback = await Promise.all(
    links.map(async (link) => {
      const item = await ctx.db.get(link.feedbackId);
      const isVisible =
        item?.organizationId === org._id &&
        (isMember || isFeedbackPubliclyVisible(org, item));
      return item && isVisible
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

    if (!(await isOrgMemberViewer(ctx, args.organizationId))) {
      return [];
    }

    let releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (args.publishedOnly) {
      releases = releases.filter((r) => r.publishedAt !== undefined);
    }

    releases.sort(byPublishedDesc);

    return await Promise.all(
      releases.map(async (release) => {
        const feedback = await withLinkedFeedback(ctx, {
          isMember: true,
          org,
          releaseId: release._id,
        });

        const snapshot = await ctx.db
          .query("releaseCommits")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .first();
        return {
          ...release,
          commitCount: snapshot?.commits.length ?? 0,
          feedback,
          sourceDate: releaseSourceDate(release, snapshot),
        };
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

    if (!(await isOrgMemberViewer(ctx, release.organizationId))) {
      return null;
    }

    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.id))
      .collect();

    const feedbackItems = await Promise.all(
      links.map(async (link) => {
        const feedback = await ctx.db.get(link.feedbackId);
        if (feedback?.organizationId !== org._id) {
          return null;
        }
        return {
          ...feedback,
          tags: await getFeedbackCategories(ctx, feedback._id, true),
        };
      })
    );

    return {
      ...release,
      feedbackItems: feedbackItems.filter((item) => item !== null),
      isMember: true,
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

    const isMember = await isOrgMemberViewer(ctx, args.organizationId);
    if (!(org.isPublic || isMember)) {
      return [];
    }

    const publishedReleases = await ctx.db
      .query("releases")
      .withIndex("by_published", (q) =>
        q.eq("organizationId", args.organizationId).gt("publishedAt", 0)
      )
      .order("desc")
      .take(MAX_PUBLIC_RELEASES);

    return await Promise.all(
      publishedReleases.map(async (release) => ({
        _creationTime: release._creationTime,
        _id: release._id,
        description: release.description,
        feedback: await withLinkedFeedback(ctx, {
          isMember,
          org,
          releaseId: release._id,
        }),
        githubHtmlUrl: release.githubHtmlUrl,
        githubReleaseId: release.githubReleaseId,
        publishedAt: release.publishedAt,
        title: release.title,
        version: release.version,
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
    const isMember = await isOrgMemberViewer(ctx, args.organizationId);
    if (!(org && isMember)) {
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
    const githubReleases = await ctx.db
      .query("githubReleases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const isExcluded = (releaseId: Id<"releases"> | undefined) =>
      args.excludeReleaseId !== undefined &&
      releaseId === args.excludeReleaseId;
    const candidateReleases = releases.filter(
      (release) => !isExcluded(release._id)
    );
    const releasedVersions = [
      ...candidateReleases.flatMap((release) =>
        release.publishedAt && release.version ? [release.version] : []
      ),
      ...githubReleases.flatMap((githubRelease) =>
        githubRelease.isDraft || isExcluded(githubRelease.refletReleaseId)
          ? []
          : [githubRelease.tagName]
      ),
    ];
    const draftVersions = candidateReleases.flatMap((release) =>
      !release.publishedAt && release.version ? [release.version] : []
    );

    const latestReleased = highestVersion(releasedVersions);
    const highestKnown = highestVersion([
      ...releasedVersions,
      ...draftVersions,
    ]);

    return {
      autoVersioning,
      current: latestReleased?.version ?? null,
      defaultIncrement,
      ...nextVersions(
        highestKnown?.parts ?? { major: 0, minor: 0, patch: 0 },
        prefix
      ),
    };
  },
});
