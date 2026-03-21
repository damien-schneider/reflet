/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const testSchema = schema as any;

const createOrg = async (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: "test-org",
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("admin_api_organization", () => {
  test("getOrganization should return org details", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const org = await t.query(internal.admin_api_organization.getOrganization, {
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

    const org = await t.query(internal.admin_api_organization.getOrganization, {
      organizationId: orgId,
    });
    expect(org).toBeNull();
  });

  test("updateOrganization should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api_organization.updateOrganization, {
      organizationId: orgId,
      name: "Updated Org",
      isPublic: true,
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
      t.mutation(internal.admin_api_organization.updateOrganization, {
        organizationId: orgId,
        name: "Ghost",
      })
    ).rejects.toThrow("Organization not found");
  });

  test("getRoadmap should return active milestones with feedback", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    // Create milestone
    const milestoneId = await t.run(async (ctx) =>
      ctx.db.insert("milestones", {
        organizationId: orgId,
        name: "Sprint 1",
        color: "#0000FF",
        timeHorizon: "now",
        order: 0,
        status: "active",
        isPublic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Create feedback and link to milestone
    const feedbackId = await t.run(async (ctx) =>
      ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Feature Request",
        description: "Please add this",
        status: "open",
        voteCount: 5,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        priority: "high",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("milestoneFeedback", {
        milestoneId,
        feedbackId,
        addedAt: Date.now(),
      })
    );

    // Create status
    await t.run(async (ctx) =>
      ctx.db.insert("organizationStatuses", {
        organizationId: orgId,
        name: "In Progress",
        color: "#FFAA00",
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const roadmap = await t.query(internal.admin_api_organization.getRoadmap, {
      organizationId: orgId,
    });

    expect(roadmap.milestones).toHaveLength(1);
    expect(roadmap.milestones[0].name).toBe("Sprint 1");
    expect(roadmap.milestones[0].feedback).toHaveLength(1);
    expect(roadmap.milestones[0].feedback[0].title).toBe("Feature Request");
    expect(roadmap.statuses).toHaveLength(1);
    expect(roadmap.statuses[0].name).toBe("In Progress");
  });

  test("getRoadmap should exclude completed milestones", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("milestones", {
        organizationId: orgId,
        name: "Active MS",
        color: "#0F0",
        timeHorizon: "now",
        order: 0,
        status: "active",
        isPublic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("milestones", {
        organizationId: orgId,
        name: "Completed MS",
        color: "#F00",
        timeHorizon: "now",
        order: 1,
        status: "completed",
        completedAt: Date.now(),
        isPublic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const roadmap = await t.query(internal.admin_api_organization.getRoadmap, {
      organizationId: orgId,
    });

    expect(roadmap.milestones).toHaveLength(1);
    expect(roadmap.milestones[0].name).toBe("Active MS");
  });
});
