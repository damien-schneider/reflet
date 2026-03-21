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

const createFeedback = async (
  t: ReturnType<typeof convexTest>,
  orgId: ReturnType<typeof createOrg> extends Promise<infer T> ? T : never,
  title = "Test Feedback"
) =>
  t.run(async (ctx) =>
    ctx.db.insert("feedback", {
      organizationId: orgId,
      title,
      description: "Description",
      status: "open",
      voteCount: 0,
      commentCount: 0,
      isApproved: true,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );

describe("admin_api_milestones", () => {
  test("createMilestone should create with auto-incremented order", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api_milestones.createMilestone, {
      organizationId: orgId,
      name: "First",
      color: "#111",
      timeHorizon: "now",
    });

    await t.mutation(internal.admin_api_milestones.createMilestone, {
      organizationId: orgId,
      name: "Second",
      color: "#222",
      timeHorizon: "next_month",
    });

    const milestones = await t.query(
      internal.admin_api_milestones.listMilestones,
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

    await t.mutation(internal.admin_api_milestones.createMilestone, {
      organizationId: orgId,
      name: "Active",
      color: "#111",
      timeHorizon: "now",
    });

    const { id: completedId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "ToComplete",
        color: "#222",
        timeHorizon: "future",
      }
    );

    await t.mutation(internal.admin_api_milestones.completeMilestone, {
      organizationId: orgId,
      milestoneId: completedId,
    });

    const active = await t.query(internal.admin_api_milestones.listMilestones, {
      organizationId: orgId,
      status: "active",
    });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Active");

    const completed = await t.query(
      internal.admin_api_milestones.listMilestones,
      { organizationId: orgId, status: "completed" }
    );
    expect(completed).toHaveLength(1);
    expect(completed[0].name).toBe("ToComplete");
  });

  test("getMilestone should return milestone with linked feedback", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "M1",
        color: "#111",
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api_milestones.linkMilestoneFeedback, {
      organizationId: orgId,
      milestoneId,
      feedbackId,
      action: "link",
    });

    const milestone = await t.query(
      internal.admin_api_milestones.getMilestone,
      { organizationId: orgId, milestoneId }
    );

    expect(milestone).not.toBeNull();
    expect(milestone?.linkedFeedback).toHaveLength(1);
  });

  test("getMilestone returns null for wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Other",
        slug: "other",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      })
    );

    const { id: milestoneId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "Private",
        color: "#000",
        timeHorizon: "now",
      }
    );

    const result = await t.query(internal.admin_api_milestones.getMilestone, {
      organizationId: otherOrgId,
      milestoneId,
    });
    expect(result).toBeNull();
  });

  test("updateMilestone should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "Old",
        color: "#000",
        timeHorizon: "now",
      }
    );

    await t.mutation(internal.admin_api_milestones.updateMilestone, {
      organizationId: orgId,
      milestoneId,
      name: "Updated",
      timeHorizon: "next_quarter",
    });

    const ms = await t.query(internal.admin_api_milestones.getMilestone, {
      organizationId: orgId,
      milestoneId,
    });
    expect(ms?.name).toBe("Updated");
    expect(ms?.timeHorizon).toBe("next_quarter");
  });

  test("completeMilestone should set status and completedAt", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "ToComplete",
        color: "#000",
        timeHorizon: "now",
      }
    );

    await t.mutation(internal.admin_api_milestones.completeMilestone, {
      organizationId: orgId,
      milestoneId,
    });

    const ms = await t.run(async (ctx) => ctx.db.get(milestoneId));
    expect(ms?.status).toBe("completed");
    expect(ms?.completedAt).toBeDefined();
  });

  test("deleteMilestone should remove milestone and feedback links", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: milestoneId } = await t.mutation(
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "ToDelete",
        color: "#000",
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api_milestones.linkMilestoneFeedback, {
      organizationId: orgId,
      milestoneId,
      feedbackId,
      action: "link",
    });

    await t.mutation(internal.admin_api_milestones.deleteMilestone, {
      organizationId: orgId,
      milestoneId,
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
      internal.admin_api_milestones.createMilestone,
      {
        organizationId: orgId,
        name: "MS",
        color: "#000",
        timeHorizon: "now",
      }
    );
    const feedbackId = await createFeedback(t, orgId);

    // Link
    await t.mutation(internal.admin_api_milestones.linkMilestoneFeedback, {
      organizationId: orgId,
      milestoneId,
      feedbackId,
      action: "link",
    });

    let links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Idempotent link
    await t.mutation(internal.admin_api_milestones.linkMilestoneFeedback, {
      organizationId: orgId,
      milestoneId,
      feedbackId,
      action: "link",
    });
    links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Unlink
    await t.mutation(internal.admin_api_milestones.linkMilestoneFeedback, {
      organizationId: orgId,
      milestoneId,
      feedbackId,
      action: "unlink",
    });
    links = await t.run(async (ctx) =>
      ctx.db.query("milestoneFeedback").collect()
    );
    expect(links).toHaveLength(0);
  });
});
