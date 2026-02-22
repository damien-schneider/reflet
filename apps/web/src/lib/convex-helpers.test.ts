import { describe, expect, it } from "vitest";
import { toId, toOrgId } from "./convex-helpers";

describe("toId", () => {
  it("returns the string cast as an Id for a valid non-empty string", () => {
    const result = toId("organizations", "abc123");
    expect(result).toBe("abc123");
  });

  it("works with different table names", () => {
    expect(toId("feedback", "fb1")).toBe("fb1");
    expect(toId("tags", "tag1")).toBe("tag1");
    expect(toId("widgets", "w1")).toBe("w1");
    expect(toId("organizationStatuses", "s1")).toBe("s1");
    expect(toId("githubLabelMappings", "g1")).toBe("g1");
  });

  it("throws for empty string", () => {
    expect(() => toId("organizations", "")).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for whitespace-only string", () => {
    expect(() => toId("feedback", "   ")).toThrow(
      "Invalid feedback ID: value must be a non-empty string"
    );
    expect(() => toId("tags", "\t")).toThrow(
      "Invalid tags ID: value must be a non-empty string"
    );
  });

  it("throws for null", () => {
    expect(() => toId("organizations", null)).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for undefined", () => {
    expect(() => toId("organizations", undefined)).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for number", () => {
    expect(() => toId("organizations", 123)).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for boolean", () => {
    expect(() => toId("organizations", true)).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for object", () => {
    expect(() => toId("organizations", {})).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for array", () => {
    expect(() => toId("organizations", [])).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("accepts strings with leading/trailing spaces (non-empty after trim check)", () => {
    // The function checks value.trim().length === 0
    // " a " trims to "a" which has length > 0, so it should pass
    expect(toId("organizations", " a ")).toBe(" a ");
  });
});

describe("toOrgId", () => {
  it("returns an organization Id for a valid string", () => {
    const result = toOrgId("org_123");
    expect(result).toBe("org_123");
  });

  it("throws for empty string", () => {
    expect(() => toOrgId("")).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });

  it("throws for whitespace-only string", () => {
    expect(() => toOrgId("  ")).toThrow(
      "Invalid organizations ID: value must be a non-empty string"
    );
  });
});
