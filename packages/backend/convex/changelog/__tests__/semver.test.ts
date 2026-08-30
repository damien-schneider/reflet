import { describe, expect, test } from "vitest";
import { compareSemver, nextVersions, parseSemver } from "../semver";

describe("parseSemver", () => {
  test("parses a standard version", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("strips the v prefix in either case", () => {
    expect(parseSemver("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemver("V1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("fills missing parts with zero", () => {
    expect(parseSemver("3")).toEqual({ major: 3, minor: 0, patch: 0 });
    expect(parseSemver("2.5")).toEqual({ major: 2, minor: 5, patch: 0 });
    expect(parseSemver("")).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  test("ignores parts beyond patch", () => {
    expect(parseSemver("1.2.3.4")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  test("collapses unparseable versions to zero", () => {
    expect(parseSemver("beta-1")).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe("compareSemver", () => {
  test("orders by major, then minor, then patch", () => {
    const cases: [string, string][] = [
      ["2.0.0", "1.9.9"],
      ["1.3.0", "1.2.9"],
      ["1.2.4", "1.2.3"],
    ];
    for (const [higher, lower] of cases) {
      expect(
        compareSemver(parseSemver(higher), parseSemver(lower))
      ).toBeGreaterThan(0);
      expect(
        compareSemver(parseSemver(lower), parseSemver(higher))
      ).toBeLessThan(0);
    }
  });

  test("returns zero for equal versions", () => {
    expect(compareSemver(parseSemver("1.2.3"), parseSemver("v1.2.3"))).toBe(0);
  });

  test("sorts a release list by version, not by string", () => {
    const sorted = ["v1.9.0", "v1.10.0", "v1.2.0"].sort((a, b) =>
      compareSemver(parseSemver(b), parseSemver(a))
    );
    expect(sorted).toEqual(["v1.10.0", "v1.9.0", "v1.2.0"]);
  });
});

describe("nextVersions", () => {
  test("bumps each level and resets the ones below", () => {
    expect(nextVersions(parseSemver("v1.4.2"), "v")).toEqual({
      major: "v2.0.0",
      minor: "v1.5.0",
      patch: "v1.4.3",
    });
  });

  test("honours a custom prefix", () => {
    expect(nextVersions(parseSemver("2.0.0"), "release-").patch).toBe(
      "release-2.0.1"
    );
  });
});
