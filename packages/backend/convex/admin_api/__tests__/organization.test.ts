/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_organization", () => {
  test("getOrganization should return org details", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const org = await t.query(internal.admin_api.organization.getOrganization, {
      organizationId: orgId,
    });

    expect(org).not.toBeNull();
    expect(org?.name).toBe("Test Org");
    expect(org?.slug).toBe("test-org");
    expect(org?.isPublic).toBe(false);
    expect(org?.subscriptionTier).toBe("free");
  });

  test("getOrganization should return null for non-existent org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    // Delete the org
    await t.run(async (ctx) => ctx.db.delete(orgId));

    const org = await t.query(internal.admin_api.organization.getOrganization, {
      organizationId: orgId,
    });
    expect(org).toBeNull();
  });

  test("updateOrganization should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.organization.updateOrganization, {
      isPublic: true,
      name: "Updated Org",
      organizationId: orgId,
      primaryColor: "#FF0000",
    });

    const org = await t.run(async (ctx) => ctx.db.get(orgId));
    expect(org?.name).toBe("Updated Org");
    expect(org?.isPublic).toBe(true);
    expect(org?.primaryColor).toBe("#FF0000");
  });

  test("updateOrganization should throw for non-existent org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    await t.run(async (ctx) => ctx.db.delete(orgId));

    await expect(
      t.mutation(internal.admin_api.organization.updateOrganization, {
        name: "Ghost",
        organizationId: orgId,
      })
    ).rejects.toThrow("Organization not found");
  });
});
