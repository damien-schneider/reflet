import { describe, expect, test } from "vitest";

// Replicated pure logic from generate-from-commits.tsx for isolated testing.
// These functions are not exported from the source.

interface Tag {
  name: string;
  sha: string;
}

const findPreviousTag = (
  tags: Tag[],
  currentVersion: string
): string | null => {
  if (tags.length === 0) {
    return null;
  }

  if (currentVersion) {
    const currentIndex = tags.findIndex(
      (t) => t.name === currentVersion || t.name === `v${currentVersion}`
    );

    if (currentIndex >= 0 && currentIndex + 1 < tags.length) {
      return tags[currentIndex + 1]?.name ?? null;
    }

    return tags[0]?.name ?? null;
  }

  return tags[0]?.name ?? null;
};

const tagExists = (tags: Array<{ name: string }>, tagName: string): boolean => {
  return tags.some((t) => t.name === tagName || t.name === `v${tagName}`);
};

describe("findPreviousTag", () => {
  test("should return null when tags array is empty", () => {
    expect(findPreviousTag([], "1.0.0")).toBeNull();
  });

  test("should return first tag when no current version is provided", () => {
    const tags: Tag[] = [
      { name: "v2.0.0", sha: "abc" },
      { name: "v1.0.0", sha: "def" },
    ];
    expect(findPreviousTag(tags, "")).toBe("v2.0.0");
  });

  test("should return the next tag when current version matches exactly", () => {
    const tags: Tag[] = [
      { name: "v2.0.0", sha: "abc" },
      { name: "v1.0.0", sha: "def" },
    ];
    expect(findPreviousTag(tags, "v2.0.0")).toBe("v1.0.0");
  });

  test("should match current version with v prefix added", () => {
    const tags: Tag[] = [
      { name: "v3.0.0", sha: "aaa" },
      { name: "v2.0.0", sha: "bbb" },
      { name: "v1.0.0", sha: "ccc" },
    ];
    expect(findPreviousTag(tags, "2.0.0")).toBe("v1.0.0");
  });

  test("should return first tag when current version is not found", () => {
    const tags: Tag[] = [
      { name: "v2.0.0", sha: "abc" },
      { name: "v1.0.0", sha: "def" },
    ];
    expect(findPreviousTag(tags, "3.0.0")).toBe("v2.0.0");
  });

  test("should return first tag when current version is the last tag", () => {
    const tags: Tag[] = [
      { name: "v2.0.0", sha: "abc" },
      { name: "v1.0.0", sha: "def" },
    ];
    // v1.0.0 is the last tag, no tag after it
    expect(findPreviousTag(tags, "v1.0.0")).toBe("v2.0.0");
  });

  test("should return first tag when only one tag exists and it matches", () => {
    const tags: Tag[] = [{ name: "v1.0.0", sha: "abc" }];
    // currentIndex=0, but 0+1 >= tags.length, so falls through to first tag
    expect(findPreviousTag(tags, "v1.0.0")).toBe("v1.0.0");
  });

  test("should return the single tag when current version does not match", () => {
    const tags: Tag[] = [{ name: "v1.0.0", sha: "abc" }];
    expect(findPreviousTag(tags, "2.0.0")).toBe("v1.0.0");
  });

  test("should handle three tags and return correct previous for first tag", () => {
    const tags: Tag[] = [
      { name: "v3.0.0", sha: "aaa" },
      { name: "v2.0.0", sha: "bbb" },
      { name: "v1.0.0", sha: "ccc" },
    ];
    expect(findPreviousTag(tags, "v3.0.0")).toBe("v2.0.0");
  });

  test("should handle tags without v prefix", () => {
    const tags: Tag[] = [
      { name: "2.0.0", sha: "abc" },
      { name: "1.0.0", sha: "def" },
    ];
    expect(findPreviousTag(tags, "2.0.0")).toBe("1.0.0");
  });

  test("should handle mixed v prefix tags", () => {
    const tags: Tag[] = [
      { name: "v2.0.0", sha: "abc" },
      { name: "1.0.0", sha: "def" },
    ];
    expect(findPreviousTag(tags, "v2.0.0")).toBe("1.0.0");
  });

  test("should not match partial version strings", () => {
    const tags: Tag[] = [
      { name: "v1.0.0", sha: "abc" },
      { name: "v0.9.0", sha: "def" },
    ];
    // "1.0" won't match "v1.0.0" (v prefix + "1.0" = "v1.0" != "v1.0.0")
    expect(findPreviousTag(tags, "1.0")).toBe("v1.0.0");
  });

  test("should handle version 0.0.1", () => {
    const tags: Tag[] = [
      { name: "v0.1.0", sha: "abc" },
      { name: "v0.0.1", sha: "def" },
    ];
    expect(findPreviousTag(tags, "v0.1.0")).toBe("v0.0.1");
  });
});

describe("tagExists", () => {
  test("should return true when tag name matches exactly", () => {
    const tags = [{ name: "v1.0.0" }, { name: "v2.0.0" }];
    expect(tagExists(tags, "v1.0.0")).toBe(true);
  });

  test("should return true when tag matches with v prefix added", () => {
    const tags = [{ name: "v1.0.0" }, { name: "v2.0.0" }];
    expect(tagExists(tags, "1.0.0")).toBe(true);
  });

  test("should return false when tag does not exist", () => {
    const tags = [{ name: "v1.0.0" }, { name: "v2.0.0" }];
    expect(tagExists(tags, "3.0.0")).toBe(false);
  });

  test("should return false when tags array is empty", () => {
    expect(tagExists([], "1.0.0")).toBe(false);
  });

  test("should return true for exact match on tag without v prefix", () => {
    const tags = [{ name: "1.0.0" }, { name: "2.0.0" }];
    expect(tagExists(tags, "1.0.0")).toBe(true);
  });

  test("should handle mixed v prefix tags", () => {
    const tags = [{ name: "v1.0.0" }, { name: "2.0.0" }];
    expect(tagExists(tags, "1.0.0")).toBe(true);
    expect(tagExists(tags, "2.0.0")).toBe(true);
  });

  test("should not match partial version strings", () => {
    const tags = [{ name: "v1.0.0" }];
    expect(tagExists(tags, "1.0")).toBe(false);
  });

  test("should match when searching with v prefix and tag has v prefix", () => {
    const tags = [{ name: "v1.0.0" }];
    expect(tagExists(tags, "v1.0.0")).toBe(true);
  });

  test("should handle version 0.0.1", () => {
    const tags = [{ name: "v0.0.1" }];
    expect(tagExists(tags, "0.0.1")).toBe(true);
    expect(tagExists(tags, "v0.0.1")).toBe(true);
  });
});
