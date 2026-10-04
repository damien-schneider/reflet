import { type Infer, v } from "convex/values";

const SEMVER_TAG_REGEX =
  /^(?:.*@)?[a-z_/-]*(\d+)\.(\d+)(?:\.(\d+))?(?:[-+][0-9a-z.+-]*)?$/i;

export const versionIncrementValidator = v.union(
  v.literal("major"),
  v.literal("minor"),
  v.literal("patch")
);

export type VersionIncrement = Infer<typeof versionIncrementValidator>;

export const isVersionIncrement = (value?: string): value is VersionIncrement =>
  versionIncrementValidator.members.some((member) => member.value === value);

export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

export const parseSemver = (version: string): SemverParts | null => {
  const match = SEMVER_TAG_REGEX.exec(version.trim());
  if (!match) {
    return null;
  }
  const [, major, minor, patch] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch ?? 0),
  };
};

export const compareSemver = (a: SemverParts, b: SemverParts): number => {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
};

export const nextVersions = (
  latest: SemverParts,
  prefix: string
): { major: string; minor: string; patch: string } => ({
  major: `${prefix}${latest.major + 1}.0.0`,
  minor: `${prefix}${latest.major}.${latest.minor + 1}.0`,
  patch: `${prefix}${latest.major}.${latest.minor}.${latest.patch + 1}`,
});
