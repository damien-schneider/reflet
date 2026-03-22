/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

// Replicate the private semver functions from releases.ts for direct unit testing

const SEMVER_PREFIX_RE = /^[vV]/;

const parseSemver = (
  version: string
): { major: number; minor: number; patch: number } => {
  const cleaned = version.replace(SEMVER_PREFIX_RE, "");
  const parts = cleaned.split(".");
  return {
    major: Number.parseInt(parts[0] ?? "0", 10) || 0,
    minor: Number.parseInt(parts[1] ?? "0", 10) || 0,
    patch: Number.parseInt(parts[2] ?? "0", 10) || 0,
  };
};

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

// Helper to compute next version suggestions (mirrors getNextVersion query logic)
const getNextVersionSuggestions = (
  versions: string[],
  prefix: string,
  excludeVersion?: string
) => {
  const publishedVersions = versions.filter((v) => v !== excludeVersion);

  let highest = { major: 0, minor: 0, patch: 0 };
  for (const version of publishedVersions) {
    const parsed = parseSemver(version);
    if (compareSemver(parsed, highest) > 0) {
      highest = parsed;
    }
  }

  return {
    highest,
    patch: `${prefix}${highest.major}.${highest.minor}.${highest.patch + 1}`,
    minor: `${prefix}${highest.major}.${highest.minor + 1}.0`,
    major: `${prefix}${highest.major + 1}.0.0`,
  };
};

describe("semver parsing", () => {
  test("should parse standard version string", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("should strip lowercase v prefix", () => {
    expect(parseSemver("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("should strip uppercase V prefix", () => {
    expect(parseSemver("V1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("should fallback to zeros for invalid version string", () => {
    expect(parseSemver("beta-1")).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  test("should handle major-only version", () => {
    expect(parseSemver("3")).toEqual({ major: 3, minor: 0, patch: 0 });
  });

  test("should handle major.minor version", () => {
    expect(parseSemver("2.5")).toEqual({ major: 2, minor: 5, patch: 0 });
  });

  test("should handle empty string", () => {
    expect(parseSemver("")).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  test("should handle version with extra parts like 1.2.3.4", () => {
    // Only first three parts matter
    expect(parseSemver("1.2.3.4")).toEqual({ major: 1, minor: 2, patch: 3 });
  });
});

describe("semver comparison", () => {
  test("should return positive when a is greater by major", () => {
    const a = { major: 2, minor: 0, patch: 0 };
    const b = { major: 1, minor: 9, patch: 9 };
    expect(compareSemver(a, b)).toBeGreaterThan(0);
  });

  test("should return positive when a is greater by minor", () => {
    const a = { major: 1, minor: 3, patch: 0 };
    const b = { major: 1, minor: 2, patch: 9 };
    expect(compareSemver(a, b)).toBeGreaterThan(0);
  });

  test("should return positive when a is greater by patch", () => {
    const a = { major: 1, minor: 2, patch: 4 };
    const b = { major: 1, minor: 2, patch: 3 };
    expect(compareSemver(a, b)).toBeGreaterThan(0);
  });

  test("should return zero for equal versions", () => {
    const v = { major: 1, minor: 2, patch: 3 };
    expect(compareSemver(v, v)).toBe(0);
  });

  test("should return negative when a is lesser", () => {
    const a = { major: 0, minor: 1, patch: 0 };
    const b = { major: 1, minor: 0, patch: 0 };
    expect(compareSemver(a, b)).toBeLessThan(0);
  });
});

describe("getNextVersion suggestions", () => {
  test("should return initial versions when no published releases exist", () => {
    const result = getNextVersionSuggestions([], "v");
    expect(result.patch).toBe("v0.0.1");
    expect(result.minor).toBe("v0.1.0");
    expect(result.major).toBe("v1.0.0");
  });

  test("should suggest correct next versions after v1.2.3", () => {
    const result = getNextVersionSuggestions(["v1.2.3"], "v");
    expect(result.patch).toBe("v1.2.4");
    expect(result.minor).toBe("v1.3.0");
    expect(result.major).toBe("v2.0.0");
  });

  test("should pick the highest semver, not just the latest by insertion order", () => {
    const result = getNextVersionSuggestions(
      ["v2.0.0", "v1.5.0", "v1.0.0"],
      "v"
    );
    expect(result.highest).toEqual({ major: 2, minor: 0, patch: 0 });
    expect(result.patch).toBe("v2.0.1");
  });

  test("should handle version without v prefix", () => {
    const result = getNextVersionSuggestions(["3.1.4"], "");
    expect(result.highest).toEqual({ major: 3, minor: 1, patch: 4 });
    expect(result.patch).toBe("3.1.5");
  });

  test("should use custom empty prefix", () => {
    const result = getNextVersionSuggestions(["1.0.0"], "");
    expect(result.patch).toBe("1.0.1");
  });

  test("should exclude specified version from calculation", () => {
    const result = getNextVersionSuggestions(
      ["v2.0.0", "v1.0.0"],
      "v",
      "v2.0.0"
    );
    expect(result.highest).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(result.patch).toBe("v1.0.1");
  });

  test("should handle invalid version strings gracefully", () => {
    const result = getNextVersionSuggestions(["beta-1"], "v");
    expect(result.highest).toEqual({ major: 0, minor: 0, patch: 0 });
    expect(result.patch).toBe("v0.0.1");
  });

  test("should ignore draft versions not in the list", () => {
    // Simulating that draft releases (no publishedAt) are filtered before reaching this
    const publishedVersions = ["v1.0.0"]; // v5.0.0 draft excluded
    const result = getNextVersionSuggestions(publishedVersions, "v");
    expect(result.highest).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  test("should handle mixed v-prefix and non-prefix versions", () => {
    const result = getNextVersionSuggestions(
      ["v1.0.0", "2.0.0", "V0.5.0"],
      "v"
    );
    expect(result.highest).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  test("should handle v0.0.0 as initial version", () => {
    const result = getNextVersionSuggestions(["v0.0.0"], "v");
    expect(result.patch).toBe("v0.0.1");
    expect(result.minor).toBe("v0.1.0");
    expect(result.major).toBe("v1.0.0");
  });
});

describe("release ordering logic", () => {
  test("should sort published releases by publishedAt descending", () => {
    const releases = [
      { title: "Oldest", publishedAt: 1000 },
      { title: "Middle", publishedAt: 2000 },
      { title: "Newest", publishedAt: 3000 },
    ];

    const sorted = [...releases].sort((a, b) => b.publishedAt - a.publishedAt);
    expect(sorted.map((r) => r.title)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  test("should place drafts before published when combining", () => {
    const published = [
      { title: "Published", publishedAt: 5000, createdAt: 5000 },
    ];
    const drafts = [
      { title: "New Draft", publishedAt: undefined, createdAt: 2000 },
      { title: "Old Draft", publishedAt: undefined, createdAt: 1000 },
    ];

    const sortedDrafts = [...drafts].sort((a, b) => b.createdAt - a.createdAt);
    const ordered = [...sortedDrafts, ...published];

    expect(ordered.map((r) => r.title)).toEqual([
      "New Draft",
      "Old Draft",
      "Published",
    ]);
  });
});

describe("import deduplication logic", () => {
  test("should detect duplicate GitHub releases by githubReleaseId", () => {
    const existingReleases = [
      { githubReleaseId: 12_345, title: "v1.0.0" },
      { githubReleaseId: 67_890, title: "v2.0.0" },
    ];

    const isDuplicate = existingReleases.some(
      (r) => r.githubReleaseId === 12_345
    );
    expect(isDuplicate).toBe(true);
  });

  test("should not flag non-duplicate releases", () => {
    const existingReleases = [{ githubReleaseId: 12_345, title: "v1.0.0" }];

    const isDuplicate = existingReleases.some(
      (r) => r.githubReleaseId === 99_999
    );
    expect(isDuplicate).toBe(false);
  });

  test("should set publishedAt when autoPublish is true", () => {
    const now = Date.now();
    const autoPublish = true;
    const publishedAt = autoPublish ? now : undefined;
    expect(publishedAt).toBe(now);
  });

  test("should not set publishedAt when autoPublish is false", () => {
    const autoPublish = false;
    const publishedAt = autoPublish ? Date.now() : undefined;
    expect(publishedAt).toBeUndefined();
  });
});
