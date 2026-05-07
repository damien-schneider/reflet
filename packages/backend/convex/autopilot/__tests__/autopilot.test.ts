/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.helpers";

const createTestContext = () => convexTest(schema, modules);
type TestContext = ReturnType<typeof createTestContext>;

function expectWorkItemId(
  taskId: Id<"autopilotWorkItems"> | null
): Id<"autopilotWorkItems"> {
  expect(taskId).toBeTypeOf("string");
  if (taskId === null) {
    throw new Error("Expected createTask to return a work item id");
  }
  return taskId;
}

const createOrg = async (t: TestContext) => {
  const orgId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: "test-org",
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );
  return orgId;
};

describe("autopilot tasks", () => {
  test("createTask creates a task with correct defaults", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const taskId = expectWorkItemId(
      await t.mutation(internal.autopilot.task_mutations.createTask, {
        organizationId: orgId,
        title: "Test task",
        description: "A test description",
        priority: "medium",
        assignedAgent: "pm",
        createdBy: "test",
      })
    );

    const task = await t.query(internal.autopilot.task_queries.getTask, {
      taskId,
    });

    expect(task).not.toBeNull();
    expect(task?.title).toBe("Test task");
    expect(task?.status).toBe("todo");
  });

  test("getOrganization returns org by ID", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const org = await t.query(internal.autopilot.task_queries.getOrganization, {
      id: orgId,
    });

    expect(org).not.toBeNull();
    expect(org?.name).toBe("Test Org");
  });

  test("getOrganization returns null for nonexistent ID", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    await t.run(async (ctx) => {
      await ctx.db.delete(orgId);
    });

    const org = await t.query(internal.autopilot.task_queries.getOrganization, {
      id: orgId,
    });

    expect(org).toBeNull();
  });

  test("updateTaskStatus updates status correctly", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const taskId = expectWorkItemId(
      await t.mutation(internal.autopilot.task_mutations.createTask, {
        organizationId: orgId,
        title: "Status test",
        description: "Test status updates",
        priority: "high",
        assignedAgent: "dev",
        createdBy: "test",
      })
    );

    await t.mutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId,
      status: "in_progress",
    });

    const task = await t.query(internal.autopilot.task_queries.getTask, {
      taskId,
    });

    expect(task?.status).toBe("in_progress");
    expect(task?.updatedAt).toBeDefined();
  });

  test("updateTaskStatus sets terminal status correctly", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const taskId = expectWorkItemId(
      await t.mutation(internal.autopilot.task_mutations.createTask, {
        organizationId: orgId,
        title: "Complete test",
        description: "Test completion",
        priority: "medium",
        assignedAgent: "dev",
        createdBy: "test",
      })
    );

    await t.mutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId,
      status: "done",
    });

    const task = await t.query(internal.autopilot.task_queries.getTask, {
      taskId,
    });

    expect(task?.status).toBe("done");
    expect(task?.updatedAt).toBeDefined();
  });

  test("getPendingTasks returns only pending tasks", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.task_mutations.createTask, {
      organizationId: orgId,
      title: "Pending task",
      description: "Should appear",
      priority: "medium",
      assignedAgent: "pm",
      createdBy: "test",
    });

    const completedTaskId = expectWorkItemId(
      await t.mutation(internal.autopilot.task_mutations.createTask, {
        organizationId: orgId,
        title: "Completed task",
        description: "Should not appear",
        priority: "low",
        assignedAgent: "dev",
        createdBy: "test",
      })
    );

    await t.mutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId: completedTaskId,
      status: "done",
    });

    const pending = await t.query(
      internal.autopilot.task_queries.getPendingTasks,
      {
        organizationId: orgId,
      }
    );

    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe("Pending task");
  });

  test("logActivity creates an activity log entry", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: orgId,
      agent: "pm",
      level: "info",
      message: "Test activity",
      details: "Some details",
    });

    const activity = await t.run(async (ctx) =>
      ctx.db.query("autopilotActivityLog").collect()
    );

    expect(activity).toHaveLength(1);
    expect(activity[0].message).toBe("Test activity");
    expect(activity[0].agent).toBe("pm");
    expect(activity[0].targetAgent).toBeUndefined();
  });

  test("logActivity persists targetAgent when provided", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: orgId,
      agent: "orchestrator",
      targetAgent: "pm",
      level: "action",
      message: "Launching PM analysis",
    });

    const activity = await t.run(async (ctx) =>
      ctx.db.query("autopilotActivityLog").collect()
    );

    expect(activity).toHaveLength(1);
    expect(activity[0].agent).toBe("orchestrator");
    expect(activity[0].targetAgent).toBe("pm");
  });
});

describe("autopilot review items", () => {
  test("createTask with needsReview creates a reviewable item", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const taskId = expectWorkItemId(
      await t.mutation(internal.autopilot.task_mutations.createTask, {
        organizationId: orgId,
        title: "Review me",
        description: "Needs review",
        priority: "medium",
        assignedAgent: "pm",
        needsReview: true,
        reviewType: "task_approval",
      })
    );

    const task = await t.query(internal.autopilot.task_queries.getTask, {
      taskId,
    });

    expect(task).not.toBeNull();
    expect(task?.needsReview).toBe(true);
    expect(task?.reviewType).toBe("task_approval");
  });

  test("createDocument creates a reviewable document", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    const docId = await t.mutation(
      internal.autopilot.documents.createDocument,
      {
        organizationId: orgId,
        type: "note",
        title: "Test note",
        content: "Test content",
        needsReview: true,
        reviewType: "content_review",
      }
    );

    expect(docId).toBeDefined();
    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc?.status).toBe("pending_review");
    expect(doc?.needsReview).toBe(true);
  });
});

describe("autopilot config", () => {
  test("createDefaultConfig creates config with defaults", async () => {
    const t = createTestContext();
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.config_mutations.createDefaultConfig, {
      organizationId: orgId,
    });

    const config = await t.query(internal.autopilot.config.getConfig, {
      organizationId: orgId,
    });

    expect(config).not.toBeNull();
    expect(config?.enabled).toBe(false);
    expect(config?.autonomyLevel).toBe("review_required");
  });
});
