import { v } from "convex/values";
import { query } from "../_generated/server";

const VERSION_PREFIX_REGEX = /^v/i;

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
