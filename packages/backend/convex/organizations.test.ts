/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

// Import all modules for convex-test
const modules = import.meta.glob("./**/*.ts");

describe("Organization slug uniqueness", () => {
  test("should reject creating an organization with a duplicate slug", async () => {
    const t = convexTest(schema, modules);

    // First, insert an organization directly into the database
    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        name: "First Org",
        slug: "my-unique-slug",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    // Attempt to create second organization with same slug - should throw
    await expect(
      t.mutation(internal.organizations.createOrganization, {
        name: "Second Org",
        slug: "my-unique-slug",
        userId: "user_123",
      })
    ).rejects.toThrow("This slug is already taken");
  });

  test("should reject creating an organization with a duplicate generated slug", async () => {
    const t = convexTest(schema, modules);

    // First, insert an organization with slug "my-org"
    await t.run(async (ctx) => {
      await ctx.db.insert("organizations", {
        name: "My Org",
        slug: "my-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    // Create second organization with same name - should throw because generated slug would be "my-org"
    await expect(
      t.mutation(internal.organizations.createOrganization, {
        name: "My Org",
        userId: "user_123",
      })
    ).rejects.toThrow("This slug is already taken");
  });

  test("should allow creating organizations with different slugs", async () => {
    const t = convexTest(schema, modules);

    // Create first organization
    const firstOrgId = await t.mutation(
      internal.organizations.createOrganization,
      {
        name: "First Org",
        slug: "first-org",
        userId: "user_123",
      }
    );

    // Create second organization with different slug - should succeed
    const secondOrgId = await t.mutation(
      internal.organizations.createOrganization,
      {
        name: "Second Org",
        slug: "second-org",
        userId: "user_123",
      }
    );

    expect(firstOrgId).toBeDefined();
    expect(secondOrgId).toBeDefined();
    expect(firstOrgId).not.toBe(secondOrgId);
  });
});
