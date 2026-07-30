/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createFeedback, createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_milestones", () => {
  test("createMilestone should create with auto-incremented order", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.milestones.createMilestone, {
      color: "#111",
      name: "First",
      organizationId: orgId,
      timeHorizon: "now",
    });

    await t.mutation(internal.admin_api.milestones.createMilestone, {
      color: "#222",
      name: "Second",
      organizationId: orgId,
      timeHorizon: "next_month",
    });

    const milestones = await t.query(
      internal.admin_api.milestones.listMilestones,
      { organizationId: orgId }
    );

    expect(milestones).toHaveLength(2);
    // Sorted by order
    expect(milestones[0].name).toBe("First");
    expect(milestones[1].name).toBe("Second");
  });

  test("listMilestones should filter by status", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.milestones.createMilestone, {
      color: "#111",
      name: "Active",
      organizationId: orgId,
      timeHorizon: "now",
    });

    const { id: completedId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#222",
        name: "ToComplete",
        organizationId: orgId,
        timeHorizon: "future",
      }
    );

    await t.mutation(internal.admin_api.milestones.completeMilestone, {
      milestoneId: completedId,
      organizationId: orgId,
    });

    const active = await t.query(internal.admin_api.milestones.listMilestones, {
      organizationId: orgId,
      status: "active",
    });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Active");

    const completed = await t.query(
      internal.admin_api.milestones.listMilestones,
      { organizationId: orgId, status: "completed" }
    );
    expect(completed).toHaveLength(1);
    expect(completed[0].name).toBe("ToComplete");
  });

  test("getMilestone should return milestone with linked feedback", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#111",
        name: "M1",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: "link",
      feedbackId,
      milestoneId,
      organizationId: orgId,
    });

    const milestone = await t.query(
      internal.admin_api.milestones.getMilestone,
      { milestoneId, organizationId: orgId }
    );

    expect(milestone).not.toBeNull();
    expect(milestone?.linkedFeedback).toHaveLength(1);
  });

  test("getMilestone returns null for wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#000",
        name: "Private",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );

    const result = await t.query(internal.admin_api.milestones.getMilestone, {
      milestoneId,
      organizationId: otherOrgId,
    });
    expect(result).toBeNull();
  });

  test("updateMilestone should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#000",
        name: "Old",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );

    await t.mutation(internal.admin_api.milestones.updateMilestone, {
      milestoneId,
      name: "Updated",
      organizationId: orgId,
      timeHorizon: "next_quarter",
    });

    const ms = await t.query(internal.admin_api.milestones.getMilestone, {
      milestoneId,
      organizationId: orgId,
    });
    expect(ms?.name).toBe("Updated");
    expect(ms?.timeHorizon).toBe("next_quarter");
  });

  test("completeMilestone should set status and completedAt", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#000",
        name: "ToComplete",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );

    await t.mutation(internal.admin_api.milestones.completeMilestone, {
      milestoneId,
      organizationId: orgId,
    });

    const ms = await t.run(async (ctx) => ctx.db.get(milestoneId));
    expect(ms?.status).toBe("completed");
    expect(ms?.completedAt).toBeDefined();
  });

  test("deleteMilestone should remove milestone and feedback links", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#000",
        name: "ToDelete",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: "link",
      feedbackId,
      milestoneId,
      organizationId: orgId,
    });

    await t.mutation(internal.admin_api.milestones.deleteMilestone, {
      milestoneId,
      organizationId: orgId,
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(milestoneId));
    expect(deleted).toBeNull();

    const links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(0);
  });

  test("linkMilestoneFeedback link/unlink cycle", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api.milestones.createMilestone,
      {
        color: "#000",
        name: "MS",
        organizationId: orgId,
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    // Link
    await t.mutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: "link",
      feedbackId,
      milestoneId,
      organizationId: orgId,
    });

    let links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Idempotent link
    await t.mutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: "link",
      feedbackId,
      milestoneId,
      organizationId: orgId,
    });
    links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Unlink
    await t.mutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: "unlink",
      feedbackId,
      milestoneId,
      organizationId: orgId,
    });
    links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(0);
  });
});
