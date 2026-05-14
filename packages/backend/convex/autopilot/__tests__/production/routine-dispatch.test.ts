/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createTestContext,
  getActivity,
  type TestContext,
} from "../test-fixtures.helpers";

async function createRoutine(
  t: TestContext,
  options: {
    agent: "cto" | "pm";
    organizationId: Id<"organizations">;
  }
) {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("autopilotRoutines", {
      organizationId: options.organizationId,
      title: "Daily routine",
      description: "Routine dispatch coverage",
      agent: options.agent,
      cronExpression: "* * * * *",
      taskTemplate: JSON.stringify({
        title: "Daily task",
        description: "Routine-created task",
        priority: "high",
      }),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
  );
}

async function listTasks(t: TestContext, organizationId: Id<"organizations">) {
  return await t.run((ctx) =>
    ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect()
  );
}

async function publishAppDescription(
  t: TestContext,
  organizationId: Id<"organizations">
) {
  // CTO's free-form chain requirement is now `identity` (post-chain-split).
  const now = Date.now();
  await t.run((ctx) =>
    ctx.db.insert("autopilotKnowledgeDocs", {
      organizationId,
      docType: "identity",
      ownerAgent: "cto",
      title: "Product Identity",
      contentFull: "Test product identity",
      contentSummary: "Test product identity",
      version: 1,
      userEdited: false,
      stalenessAlertDays: 30,
      lastUpdatedAt: now,
      createdAt: now,
    })
  );
}

describe("autopilot routine dispatch", () => {
  test("routine creation rejects agents that cannot dispatch routine tasks", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.routines.createRoutine, {
        organizationId,
        title: "PM routine",
        agent: "pm",
        cronExpression: "* * * * *",
        taskTemplate: JSON.stringify({ title: "PM task" }),
      })
    ).rejects.toThrow("Routine agent pm cannot dispatch routine tasks");
  });

  test("routine evaluation disables non-dispatchable PM routines instead of creating stuck tasks", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const routineId = await createRoutine(t, {
      organizationId,
      agent: "pm",
    });

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    const routine = await t.run((ctx) => ctx.db.get(routineId));
    const tasks = await listTasks(t, organizationId);
    const activity = await getActivity(t);

    expect(dispatched).toBe(0);
    expect(routine?.enabled).toBe(false);
    expect(routine?.lastRunAt).toBeUndefined();
    expect(tasks).toEqual([]);
    expect(
      activity.some((entry) =>
        entry.message.includes("disabled because agent pm cannot dispatch")
      )
    ).toBe(true);
  });

  test("routine evaluation still creates tasks for dispatchable agents", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    // CTO routine requires app_description published per chain gate.
    await publishAppDescription(t, organizationId);
    await createRoutine(t, {
      organizationId,
      agent: "cto",
    });

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    const tasks = await listTasks(t, organizationId);

    expect(dispatched).toBe(1);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.assignedAgent).toBe("cto");
  });

  test("routine evaluation skips when chain dependencies are not yet published", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    // No app_description published — CTO chain gate must block dispatch.
    await createRoutine(t, {
      organizationId,
      agent: "cto",
    });

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    const tasks = await listTasks(t, organizationId);
    const activity = await getActivity(t);

    expect(dispatched).toBe(0);
    expect(tasks).toEqual([]);
    expect(
      activity.some((entry) => entry.message.includes("chain not ready"))
    ).toBe(true);
  });
});
