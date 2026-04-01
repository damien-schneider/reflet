/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_statuses", () => {
  test("createStatus should create with auto-incremented order", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.statuses.createStatus, {
      organizationId: orgId,
      name: "Open",
      color: "#00FF00",
    });

    await t.mutation(internal.admin_api.statuses.createStatus, {
      organizationId: orgId,
      name: "Closed",
      color: "#FF0000",
    });

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });

    expect(statuses).toHaveLength(2);
    expect(statuses[0].name).toBe("Open");
    expect(statuses[0].order).toBe(0);
    expect(statuses[1].name).toBe("Closed");
    expect(statuses[1].order).toBe(1);
  });

  test("listStatuses should return statuses for org only", async () => {
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

    await t.mutation(internal.admin_api.statuses.createStatus, {
      organizationId: orgId,
      name: "Ours",
      color: "#111",
    });
    await t.mutation(internal.admin_api.statuses.createStatus, {
      organizationId: otherOrgId,
      name: "Theirs",
      color: "#222",
    });

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });
    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe("Ours");
  });

  test("updateStatus should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { organizationId: orgId, name: "Old", color: "#000" }
    );

    await t.mutation(internal.admin_api.statuses.updateStatus, {
      organizationId: orgId,
      statusId,
      name: "New",
      color: "#FFF",
    });

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });
    expect(statuses[0].name).toBe("New");
    expect(statuses[0].color).toBe("#FFF");
  });

  test("updateStatus should reject wrong org", async () => {
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

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { organizationId: orgId, name: "Status", color: "#000" }
    );

    await expect(
      t.mutation(internal.admin_api.statuses.updateStatus, {
        organizationId: otherOrgId,
        statusId,
        name: "Hacked",
      })
    ).rejects.toThrow("Status not found");
  });

  test("deleteStatus should remove and clear feedback references", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { organizationId: orgId, name: "ToDelete", color: "#F00" }
    );

    // Create feedback that references this status
    const feedbackId = await t.run(async (ctx) =>
      ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Test",
        description: "Desc",
        status: "open",
        organizationStatusId: statusId,
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.statuses.deleteStatus, {
      organizationId: orgId,
      statusId,
    });

    // Status should be deleted
    const deleted = await t.run(async (ctx) => ctx.db.get(statusId));
    expect(deleted).toBeNull();

    // Feedback should have organizationStatusId cleared
    const feedback = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(feedback?.organizationStatusId).toBeUndefined();
  });
});
