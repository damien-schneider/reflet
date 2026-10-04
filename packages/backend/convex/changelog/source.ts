import type { Infer } from "convex/values";
import { compareSemver, parseSemver, type SemverParts } from "./semver";
import type { releaseSourceValidator } from "./tableFields";

export const MAX_SOURCE_COMMITS = 100;
export const MAX_SOURCE_FILES = 50;
export const MAX_SOURCE_PULL_REQUESTS = 50;

export type ReleaseSource = Infer<typeof releaseSourceValidator>;

export interface GitTag {
  name: string;
  sha: string;
}

interface SemverTag extends GitTag {
  semver: SemverParts;
}

export interface ReleaseRange {
  baseRef?: string;
  headRef: string;
  headTagSha?: string;
}

const toSemverTagsNewestFirst = (tags: GitTag[]): SemverTag[] =>
  tags
    .flatMap((tag) => {
      const semver = parseSemver(tag.name);
      return semver ? [{ ...tag, semver }] : [];
    })
    .sort((a, b) => compareSemver(b.semver, a.semver));

export const sortTagsNewestFirst = (tags: GitTag[]): GitTag[] =>
  toSemverTagsNewestFirst(tags).map(({ name, sha }) => ({ name, sha }));

const findVersionTag = (
  tags: GitTag[],
  orderedTags: SemverTag[],
  version: string
): GitTag | undefined => {
  const exact = tags.find((tag) => tag.name === version);
  if (exact) {
    return exact;
  }
  const versionSemver = parseSemver(version);
  if (!versionSemver) {
    return;
  }
  return orderedTags.find(
    (tag) => compareSemver(tag.semver, versionSemver) === 0
  );
};

export const selectReleaseRange = ({
  previousHeadSha,
  tags,
  targetBranch,
  version,
}: {
  previousHeadSha?: string;
  tags: GitTag[];
  targetBranch: string;
  version?: string;
}): ReleaseRange => {
  const orderedTags = toSemverTagsNewestFirst(tags);
  const headTag = version
    ? findVersionTag(tags, orderedTags, version)
    : undefined;

  if (headTag) {
    const headSemver = parseSemver(headTag.name);
    const baseTag = headSemver
      ? orderedTags.find((tag) => compareSemver(tag.semver, headSemver) < 0)
      : undefined;
    return {
      baseRef: baseTag?.name,
      headRef: headTag.name,
      headTagSha: headTag.sha,
    };
  }

  const versionSemver = version ? parseSemver(version) : null;
  const baseTag = versionSemver
    ? orderedTags.find((tag) => compareSemver(tag.semver, versionSemver) < 0)
    : orderedTags[0];
  return { baseRef: baseTag?.name ?? previousHeadSha, headRef: targetBranch };
};
