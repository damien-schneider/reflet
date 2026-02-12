import { describe, expect, it } from "vitest";
import { computeDashboardNavigation } from "./use-dashboard-navigation";

const makeOrg = (slug: string, role: string | null = "owner") => ({
  _id: `org_${slug}`,
  slug,
  name: slug,
  role,
});

describe("computeDashboardNavigation", () => {
  describe("when data is loading (undefined)", () => {
    it("should not redirect when organizations is undefined", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: null,
        organizations: undefined,
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should not redirect when org is undefined (loading)", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: undefined,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should not redirect when both are undefined", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: undefined,
        organizations: undefined,
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });
  });

  describe("on /dashboard (no orgSlug)", () => {
    it("should auto-select when there is exactly one organization", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBe("/dashboard/my-organization");
    });

    it("should not auto-select when there are multiple organizations", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: [makeOrg("org-a"), makeOrg("org-b")],
      });
      expect(result.redirectTo).toBeNull();
    });

    it("should not auto-select when organizations list is empty", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: [],
      });
      expect(result.redirectTo).toBeNull();
    });

    it("should not auto-select when organizations is undefined", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: undefined,
      });
      expect(result.redirectTo).toBeNull();
    });
  });

  describe("on /dashboard/:orgSlug - MUST NEVER redirect", () => {
    it("should never redirect when org is loaded with valid role", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: makeOrg("my-organization", "owner"),
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect when org is loading", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: undefined,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect when org is null but slug is in user list", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: null,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect when org has role:null but slug is in user list", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: makeOrg("my-organization", null),
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect even when org is genuinely inaccessible", () => {
      const result = computeDashboardNavigation({
        orgSlug: "other-org",
        org: null,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(true);
    });

    it("should never redirect when organizations is empty (auth not ready)", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: null,
        organizations: [],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect when both queries return no-auth results", () => {
      // Simulates the race condition: auth not propagated to Convex yet
      // list returns [] (no user), getBySlug returns null (private) or {role:null} (public)
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: null,
        organizations: [],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should never redirect when org has role:null and organizations empty", () => {
      // Public org, auth not ready
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: makeOrg("my-organization", null),
        organizations: [],
      });
      expect(result.redirectTo).toBeNull();
      expect(result.orgNotAccessible).toBe(false);
    });
  });

  describe("orgNotAccessible detection", () => {
    it("should be true when org is null and slug not in user list", () => {
      const result = computeDashboardNavigation({
        orgSlug: "nonexistent",
        org: null,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.orgNotAccessible).toBe(true);
    });

    it("should be true when org has no role and slug not in user list", () => {
      const result = computeDashboardNavigation({
        orgSlug: "public-org",
        org: makeOrg("public-org", null),
        organizations: [makeOrg("my-organization")],
      });
      expect(result.orgNotAccessible).toBe(true);
    });

    it("should be false when org has a valid role", () => {
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: makeOrg("my-organization", "member"),
        organizations: [makeOrg("my-organization")],
      });
      expect(result.orgNotAccessible).toBe(false);
    });

    it("should be false when slug is in user list even if getBySlug returns null", () => {
      // Race condition: list loaded with auth, getBySlug hasn't re-evaluated yet
      const result = computeDashboardNavigation({
        orgSlug: "my-organization",
        org: null,
        organizations: [makeOrg("my-organization")],
      });
      expect(result.orgNotAccessible).toBe(false);
    });
  });

  describe("hasOrganizations", () => {
    it("should be true when organizations has entries", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: [makeOrg("my-org")],
      });
      expect(result.hasOrganizations).toBe(true);
    });

    it("should be false when organizations is empty", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: [],
      });
      expect(result.hasOrganizations).toBe(false);
    });

    it("should be false when organizations is undefined", () => {
      const result = computeDashboardNavigation({
        orgSlug: undefined,
        org: undefined,
        organizations: undefined,
      });
      expect(result.hasOrganizations).toBe(false);
    });
  });
});
