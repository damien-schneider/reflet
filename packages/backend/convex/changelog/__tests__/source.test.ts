import { describe, expect, test } from "vitest";
import { selectReleaseRange, sortTagsNewestFirst } from "../source";

const tag = (name: string) => ({ name, sha: `sha-${name}` });

describe("selectReleaseRange", () => {
  test("orders tags by semver, not by API order", () => {
    const tags = [tag("v1.10.0"), tag("v1.2.0"), tag("v1.9.0"), tag("nightly")];

    expect(sortTagsNewestFirst(tags).map(({ name }) => name)).toEqual([
      "v1.10.0",
      "v1.9.0",
      "v1.2.0",
    ]);
    expect(
      selectReleaseRange({ tags, targetBranch: "main", version: "v1.10.0" })
    ).toEqual({
      baseRef: "v1.9.0",
      headRef: "v1.10.0",
      headTagSha: "sha-v1.10.0",
    });
  });

  test("matches a release version with or without the tag prefix", () => {
    const tags = [tag("v1.1.0"), tag("v1.2.0")];

    expect(
      selectReleaseRange({ tags, targetBranch: "main", version: "1.2.0" })
    ).toEqual({
      baseRef: "v1.1.0",
      headRef: "v1.2.0",
      headTagSha: "sha-v1.2.0",
    });
  });

  test("has no base when the head is the oldest tag", () => {
    const tags = [tag("v2.0.0"), tag("v1.0.0")];

    expect(
      selectReleaseRange({
        previousHeadSha: "abc",
        tags,
        targetBranch: "main",
        version: "v1.0.0",
      })
    ).toEqual({
      baseRef: undefined,
      headRef: "v1.0.0",
      headTagSha: "sha-v1.0.0",
    });
  });

  test("falls back to the previous release head on the target branch without tags", () => {
    expect(
      selectReleaseRange({
        previousHeadSha: "abc",
        tags: [],
        targetBranch: "develop",
        version: "v1.0.0",
      })
    ).toEqual({ baseRef: "abc", headRef: "develop" });
  });

  test("uses the highest tag below an untagged version as base", () => {
    const tags = [tag("v1.0.0"), tag("v1.1.0")];

    expect(
      selectReleaseRange({ tags, targetBranch: "main", version: "v1.2.0" })
    ).toEqual({ baseRef: "v1.1.0", headRef: "main" });
  });
});
