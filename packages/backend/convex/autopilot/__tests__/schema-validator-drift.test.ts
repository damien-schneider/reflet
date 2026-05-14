/// <reference types="vite/client" />
/**
 * Schema/validator drift detector.
 *
 * For every autopilot query that declares a `returns` validator, insert a row
 * with EVERY schema field populated and call the query. If the validator is
 * missing a field the schema defines (or vice-versa), Convex throws
 * ReturnsValidationError and the test fails.
 *
 * This was added because workItemValidator silently drifted from the schema
 * (missing identifier/assigneeUserId/dueDate/etc), surfacing only as a runtime
 * error in convex dev.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

const NOW = Date.now();
const ORG_NAME = "Drift Test Org";

describe("schema/validator drift", () => {
  test("workItem queries accept fully-populated rows without ReturnsValidationError", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: ORG_NAME,
        slug: "drift-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: NOW,
      })
    );

    const parentId = await t.run(async (ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId: orgId,
        type: "initiative",
        title: "Parent initiative",
        description: "Drift parent",
        status: "done",
        priority: "high",
        needsReview: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    );

    const childId = await t.run(async (ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId: orgId,
        type: "task",
        parentId,
        title: "Fully populated child",
        description: "Every optional field set",
        status: "todo",
        priority: "medium",
        assignedAgent: "cto",
        assigneeUserId: "user_42",
        dueDate: NOW + 1000,
        targetDate: NOW + 2000,
        startDate: NOW,
        estimate: 5,
        confidence: 0.8,
        identifier: "ORG-1",
        needsReview: true,
        reviewType: "spec",
        reviewedAt: NOW,
        prUrl: "https://github.com/x/y/pull/1",
        prNumber: 1,
        branch: "feat/test",
        completionPercent: 50,
        acceptanceCriteria: ["AC1", "AC2"],
        isPublicRoadmap: true,
        includeInChangelog: true,
        createdByUser: "user_42",
        tags: ["beta", "test"],
        createdBy: "system",
        createdAt: NOW,
        updatedAt: NOW,
      })
    );

    // All queries returning workItem(s) — fail loudly if validator drifts.
    const byId = await t.query(internal.autopilot.task_queries.getTask, {
      taskId: childId,
    });
    expect(byId?._id).toBe(childId);

    const dispatchable = await t.query(
      internal.autopilot.task_queries.getDispatchableTasks,
      { organizationId: orgId }
    );
    expect(dispatchable.some((row) => row._id === childId)).toBe(true);

    const pending = await t.query(
      internal.autopilot.task_queries.getPendingTasks,
      { organizationId: orgId }
    );
    expect(pending.some((row) => row._id === childId)).toBe(true);

    const subtasks = await t.query(
      internal.autopilot.task_queries.getSubtasks,
      { parentTaskId: parentId }
    );
    expect(subtasks.some((row) => row._id === childId)).toBe(true);

    const all = await t.query(internal.autopilot.task_queries.getTasksByOrg, {
      organizationId: orgId,
    });
    expect(all.some((row) => row._id === childId)).toBe(true);
  }, 20_000);

  test("activity log queries accept rows with every optional field set", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: ORG_NAME,
        slug: "drift-activity",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: NOW,
      })
    );

    const workItemId = await t.run(async (ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId: orgId,
        type: "task",
        title: "Activity ref",
        description: "Test",
        status: "todo",
        priority: "medium",
        needsReview: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("autopilotActivityLog", {
        organizationId: orgId,
        workItemId,
        agent: "cto",
        targetAgent: "pm",
        level: "success",
        message: "Activity message",
        details: "Details",
        action: "task_assignment",
        entityType: "work_item",
        entityId: workItemId,
        createdAt: NOW,
      })
    );

    const recent = await t.query(
      internal.autopilot.task_queries.getRecentActivity,
      { organizationId: orgId, limit: 10 }
    );
    expect(recent.length).toBeGreaterThan(0);
  }, 20_000);
});
