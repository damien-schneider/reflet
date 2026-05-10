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
});
