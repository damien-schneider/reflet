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

  test("getRoadmap should return active milestones with feedback", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    // Create milestone
    const milestoneId = await t.run(async (ctx) =>
      ctx.db.insert("milestones", {
        color: "#0000FF",
        createdAt: Date.now(),
        isPublic: true,
        name: "Sprint 1",
        order: 0,
        organizationId: orgId,
        status: "active",
        timeHorizon: "now",
        updatedAt: Date.now(),
      })
    );

    // Create feedback and link to milestone
    const feedbackId = await t.run(async (ctx) =>
      ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Please add this",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        priority: "high",
        status: "open",
        title: "Feature Request",
        updatedAt: Date.now(),
        voteCount: 5,
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("milestoneFeedback", {
        addedAt: Date.now(),
        feedbackId,
        milestoneId,
      })
    );

    // Create status
    await t.run(async (ctx) =>
      ctx.db.insert("organizationStatuses", {
        color: "#FFAA00",
        createdAt: Date.now(),
        name: "In Progress",
        order: 0,
        organizationId: orgId,
        updatedAt: Date.now(),
      })
    );

    const roadmap = await t.query(internal.admin_api.organization.getRoadmap, {
      organizationId: orgId,
    });

    expect(roadmap.milestones).toHaveLength(1);
    expect(roadmap.milestones[0].name).toBe("Sprint 1");
    expect(roadmap.milestones[0].feedback).toHaveLength(1);
    expect(roadmap.milestones[0]?.feedback[0]?.title).toBe("Feature Request");
    expect(roadmap.statuses).toHaveLength(1);
    expect(roadmap.statuses[0].name).toBe("In Progress");
  });

  test("getRoadmap should exclude completed milestones", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("milestones", {
        color: "#0F0",
        createdAt: Date.now(),
        isPublic: true,
        name: "Active MS",
        order: 0,
        organizationId: orgId,
        status: "active",
        timeHorizon: "now",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("milestones", {
        color: "#F00",
        completedAt: Date.now(),
        createdAt: Date.now(),
        isPublic: true,
        name: "Completed MS",
        order: 1,
        organizationId: orgId,
        status: "completed",
        timeHorizon: "now",
        updatedAt: Date.now(),
      });
    });

    const roadmap = await t.query(internal.admin_api.organization.getRoadmap, {
      organizationId: orgId,
    });

    expect(roadmap.milestones).toHaveLength(1);
    expect(roadmap.milestones[0].name).toBe("Active MS");
  });
});
