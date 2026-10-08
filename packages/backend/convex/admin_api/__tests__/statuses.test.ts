/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test_helpers";

describe("admin_api_statuses", () => {
  test("createStatus should create with auto-incremented order", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.statuses.createStatus, {
      color: "green",
      name: "Open",
      organizationId: orgId,
    });

    await t.mutation(internal.admin_api.statuses.createStatus, {
      color: "red",
      name: "Closed",
      organizationId: orgId,
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
    const t = convexTest(schema, modules);
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

    await t.mutation(internal.admin_api.statuses.createStatus, {
      color: "gray",
      name: "Ours",
      organizationId: orgId,
    });
    await t.mutation(internal.admin_api.statuses.createStatus, {
      color: "blue",
      name: "Theirs",
      organizationId: otherOrgId,
    });

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });
    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe("Ours");
  });

  test("listStatuses follows the lifecycle even when Backlog was created last", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    for (const [name, semanticStatus] of [
      ["Done", "completed"],
      ["Planned", "planned"],
      ["Building", "in_progress"],
      ["Backlog", "open"],
    ] as const) {
      await t.mutation(internal.admin_api.statuses.createStatus, {
        color: "gray",
        name,
        organizationId: orgId,
        semanticStatus,
      });
    }

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });

    expect(statuses.map((status) => status.name)).toEqual([
      "Backlog",
      "Planned",
      "Building",
      "Done",
    ]);
  });

  test("updateStatus should update fields", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { color: "gray", name: "Old", organizationId: orgId }
    );

    await t.mutation(internal.admin_api.statuses.updateStatus, {
      color: "pink",
      name: "New",
      organizationId: orgId,
      statusId,
    });

    const statuses = await t.query(internal.admin_api.statuses.listStatuses, {
      organizationId: orgId,
    });
    expect(statuses[0].name).toBe("New");
    expect(statuses[0].color).toBe("pink");
  });

  test("updateStatus should reject wrong org", async () => {
    const t = convexTest(schema, modules);
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

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { color: "gray", name: "Status", organizationId: orgId }
    );

    await expect(
      t.mutation(internal.admin_api.statuses.updateStatus, {
        name: "Hacked",
        organizationId: otherOrgId,
        statusId,
      })
    ).rejects.toThrow("Status not found");
  });

  test("deleteStatus keeps the lifecycle by moving feedback to an equivalent column", async () => {
    const t = convexTest(schema, modules);
    const orgId = await createOrg(t);

    const { id: statusId } = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { color: "red", name: "ToDelete", organizationId: orgId }
    );

    const feedbackId = await t.run(async (ctx) =>
      ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Desc",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        organizationStatusId: statusId,
        status: "open",
        title: "Test",
        updatedAt: Date.now(),
        voteCount: 0,
      })
    );

    const replacement = await t.mutation(
      internal.admin_api.statuses.createStatus,
      { color: "gray", name: "Replacement", organizationId: orgId }
    );
    await t.mutation(internal.admin_api.statuses.deleteStatus, {
      organizationId: orgId,
      statusId,
    });

    const deleted = await t.run(async (ctx) => ctx.db.get(statusId));
    expect(deleted).toBeNull();

    const feedback = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(feedback?.organizationStatusId).toBe(replacement.id);
  });
});
