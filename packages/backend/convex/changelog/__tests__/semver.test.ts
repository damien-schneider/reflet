import { describe, expect, test } from "vitest";
import {
  compareSemver,
  nextVersions,
  parseSemver,
  type SemverParts,
} from "../semver";

describe("parseSemver", () => {
  test("parses a standard version", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("strips the v prefix in either case", () => {
    expect(parseSemver("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemver("V1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("defaults a missing patch to zero", () => {
    expect(parseSemver("2.5")).toEqual({ major: 2, minor: 5, patch: 0 });
  });

  test("strips changesets package and custom prefixes", () => {
    expect(parseSemver("@scope/pkg@1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(parseSemver("release-2.0.1")).toEqual({
      major: 2,
      minor: 0,
      patch: 1,
    });
  });

  test("ignores pre-release and build suffixes", () => {
    expect(parseSemver("v1.2.3-beta.1+build.5")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  test("rejects strings that are not versions", () => {
    for (const notVersion of ["", "3", "beta-1", "2024-W05", "1.2.3.4"]) {
      expect(parseSemver(notVersion)).toBeNull();
    }
  });
});

const parsed = (version: string): SemverParts => {
  const parts = parseSemver(version);
  if (!parts) {
    throw new Error(`${version} is not a version`);
  }
  return parts;
};

describe("compareSemver", () => {
  test("orders by major, then minor, then patch", () => {
    const cases: [string, string][] = [
      ["2.0.0", "1.9.9"],
      ["1.3.0", "1.2.9"],
      ["1.2.4", "1.2.3"],
    ];
    for (const [higher, lower] of cases) {
      expect(compareSemver(parsed(higher), parsed(lower))).toBeGreaterThan(0);
      expect(compareSemver(parsed(lower), parsed(higher))).toBeLessThan(0);
    }
  });

  test("returns zero for equal versions", () => {
    expect(compareSemver(parsed("1.2.3"), parsed("v1.2.3"))).toBe(0);
  });

  test("sorts a release list by version, not by string", () => {
    const sorted = ["v1.9.0", "v1.10.0", "v1.2.0"].sort((a, b) =>
      compareSemver(parsed(b), parsed(a))
    );
    expect(sorted).toEqual(["v1.10.0", "v1.9.0", "v1.2.0"]);
  });
});

describe("nextVersions", () => {
  test("bumps each level and resets the ones below", () => {
    expect(nextVersions(parsed("v1.4.2"), "v")).toEqual({
      major: "v2.0.0",
      minor: "v1.5.0",
      patch: "v1.4.3",
    });
  });

  test("honours a custom prefix", () => {
    expect(nextVersions(parsed("2.0.0"), "release-").patch).toBe(
      "release-2.0.1"
    );
  });
});
