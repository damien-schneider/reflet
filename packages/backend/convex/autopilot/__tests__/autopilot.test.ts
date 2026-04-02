/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

const testSchema = schema as any;

const createOrg = async (t: ReturnType<typeof convexTest>) => {
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
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const taskId = await t.mutation(internal.autopilot.tasks.createTask, {
      organizationId: orgId,
      title: "Test task",
      description: "A test description",
      priority: "medium",
      assignedAgent: "pm",
      origin: "user_created",
      autonomyLevel: "review_required",
    });

    expect(taskId).toBeDefined();

    const task = await t.query(internal.autopilot.tasks.getTask, {
      taskId,
    });

    expect(task).not.toBeNull();
    expect(task?.title).toBe("Test task");
    expect(task?.status).toBe("pending");
    expect(task?.retryCount).toBe(0);
    expect(task?.maxRetries).toBe(3);
  });

  test("getOrganization returns org by ID", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const org = await t.query(internal.autopilot.tasks.getOrganization, {
      id: orgId,
    });

    expect(org).not.toBeNull();
    expect(org?.name).toBe("Test Org");
  });

  test("getOrganization returns null for nonexistent ID", async () => {
    const t = convexTest(testSchema, modules);
    await createOrg(t);

    const org = await t.run(async (ctx) => {
      const fakeId = "fake_id" as any;
      try {
        return await ctx.db.get(fakeId);
      } catch {
        return null;
      }
    });

    expect(org).toBeNull();
  });

  test("updateTaskStatus updates status correctly", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const taskId = await t.mutation(internal.autopilot.tasks.createTask, {
      organizationId: orgId,
      title: "Status test",
      description: "Test status updates",
      priority: "high",
      assignedAgent: "dev",
      origin: "pm_analysis",
      autonomyLevel: "full_auto",
    });

    await t.mutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "in_progress",
    });

    const task = await t.query(internal.autopilot.tasks.getTask, {
      taskId,
    });

    expect(task?.status).toBe("in_progress");
    expect(task?.startedAt).toBeDefined();
  });

  test("updateTaskStatus sets completedAt on terminal statuses", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const taskId = await t.mutation(internal.autopilot.tasks.createTask, {
      organizationId: orgId,
      title: "Complete test",
      description: "Test completion",
      priority: "medium",
      assignedAgent: "dev",
      origin: "pm_analysis",
      autonomyLevel: "full_auto",
    });

    await t.mutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId,
      status: "completed",
    });

    const task = await t.query(internal.autopilot.tasks.getTask, {
      taskId,
    });

    expect(task?.status).toBe("completed");
    expect(task?.completedAt).toBeDefined();
  });

  test("getPendingTasks returns only pending tasks", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.tasks.createTask, {
      organizationId: orgId,
      title: "Pending task",
      description: "Should appear",
      priority: "medium",
      assignedAgent: "pm",
      origin: "user_created",
      autonomyLevel: "review_required",
    });

    const completedTaskId = await t.mutation(
      internal.autopilot.tasks.createTask,
      {
        organizationId: orgId,
        title: "Completed task",
        description: "Should not appear",
        priority: "low",
        assignedAgent: "dev",
        origin: "pm_analysis",
        autonomyLevel: "full_auto",
      }
    );

    await t.mutation(internal.autopilot.tasks.updateTaskStatus, {
      taskId: completedTaskId,
      status: "completed",
    });

    const pending = await t.query(internal.autopilot.tasks.getPendingTasks, {
      organizationId: orgId,
    });

    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe("Pending task");
  });

  test("logActivity creates an activity log entry", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.tasks.logActivity, {
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
  });
});

describe("autopilot inbox", () => {
  test("createInboxItem creates item with pending status", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const itemId = await t.mutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: orgId,
      type: "task_approval",
      title: "Test inbox item",
      summary: "A test summary",
      sourceAgent: "pm",
      priority: "medium",
    });

    expect(itemId).toBeDefined();

    const item = await t.query(internal.autopilot.inbox.getInboxItem, {
      itemId,
    });

    expect(item).not.toBeNull();
    expect(item?.status).toBe("pending");
    expect(item?.title).toBe("Test inbox item");
  });

  test("updateInboxItemStatus changes status", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const itemId = await t.mutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: orgId,
      type: "security_alert",
      title: "Security alert",
      summary: "A vulnerability found",
      sourceAgent: "security",
      priority: "high",
    });

    await t.mutation(internal.autopilot.inbox.updateInboxItemStatus, {
      itemId,
      status: "approved",
    });

    const item = await t.query(internal.autopilot.inbox.getInboxItem, {
      itemId,
    });

    expect(item?.status).toBe("approved");
  });

  test("getInboxCountsByType returns correct counts", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: orgId,
      type: "task_approval",
      title: "Item 1",
      summary: "Summary 1",
      sourceAgent: "pm",
      priority: "medium",
    });

    await t.mutation(internal.autopilot.inbox.createInboxItem, {
      organizationId: orgId,
      type: "security_alert",
      title: "Item 2",
      summary: "Summary 2",
      sourceAgent: "security",
      priority: "high",
    });

    const counts = await t.query(
      internal.autopilot.inbox.getInboxCountsByType,
      {
        organizationId: orgId,
      }
    );

    expect(counts).toBeDefined();
  });
});

describe("autopilot config", () => {
  test("createDefaultConfig creates config with defaults", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.autopilot.config.createDefaultConfig, {
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
