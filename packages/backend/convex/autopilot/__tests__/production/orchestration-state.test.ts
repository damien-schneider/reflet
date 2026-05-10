/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import {
  createAutopilotConfig,
  createOrg,
  createTestContext,
  type TestContext,
} from "../test-fixtures.helpers";

const createFreeOrg = (t: TestContext) =>
  t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: "Free Routine Org",
      slug: `free-routine-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("autopilot production orchestration state", () => {
  test("self-healing cancels active runs when it cancels stuck work", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const staleAt = Date.now() - 3 * 60 * 60 * 1000;
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Stale external run",
        description: "The run must not remain active after self-heal.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: staleAt,
        updatedAt: staleAt,
      })
    );
    const runId = await t.mutation(
      internal.autopilot.task_mutations.createRun,
      {
        organizationId,
        taskId,
        adapter: "codex",
      }
    );
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      status: "waiting_ci",
      externalRef: "codex:acme/reflet#42",
    });

    await t.action(internal.autopilot.self_heal.runSelfHealing, {});

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));
    expect(rows.task?.status).toBe("cancelled");
    expect(rows.run?.status).toBe("cancelled");
  });

  test("polling times out from the run start time, not the work item update time", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { adapter: "builtin" });
    await t.mutation(
      internal.autopilot.config_mutations.upsertAdapterCredentials,
      {
        organizationId,
        adapter: "builtin",
        credentials: JSON.stringify({ githubToken: "github-token" }),
      }
    );

    const now = Date.now();
    const staleStartedAt = now - 31 * 60 * 1000;
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Recently touched stale run",
        description: "Task updates must not extend provider polling forever.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: staleStartedAt,
        updatedAt: now,
      })
    );
    const runId = await t.mutation(
      internal.autopilot.task_mutations.createRun,
      {
        organizationId,
        taskId,
        adapter: "builtin",
      }
    );
    await t.run((ctx) =>
      ctx.db.patch(runId, {
        startedAt: staleStartedAt,
        status: "waiting_ci",
        externalRef: "not-a-valid-provider-ref",
      })
    );

    await t.action(internal.autopilot.execution_lifecycle.pollTaskStatus, {
      organizationId,
      taskId,
      runId,
      externalRef: "not-a-valid-provider-ref",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));
    expect(rows.task?.status).toBe("cancelled");
    expect(rows.run?.status).toBe("failed");
    expect(rows.run?.errorMessage).toBe("Timed out");
  });

  test("heartbeat does not dispatch child work before the parent is done", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const parentId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Parent task",
        description: "Child work depends on this task.",
        status: "in_progress",
        priority: "high",
        assignedAgent: "cto",
        needsReview: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const childId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Blocked child task",
        description: "This must wait for the parent.",
        status: "todo",
        priority: "critical",
        assignedAgent: "cto",
        parentId,
        needsReview: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    await t.run((ctx) =>
      ctx.db.insert("autopilotActivityLog", {
        organizationId,
        agent: "cto",
        level: "action",
        message: "CTO was already woken this tick",
        createdAt: Date.now(),
      })
    );

    await t.action(internal.autopilot.heartbeat.runHeartbeat, {});

    const child = await t.run((ctx) => ctx.db.get(childId));
    expect(child?.status).toBe("todo");
  });

  test("agents can wake again after a no-output cooldown", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await t.run((ctx) =>
      ctx.db.insert("autopilotActivityLog", {
        organizationId,
        agent: "growth",
        level: "action",
        message: "Growth started but produced no content",
        createdAt: Date.now() - 31 * 60 * 1000,
      })
    );

    const canWake = await t.query(
      internal.autopilot.heartbeat.didAgentProduceOutput,
      { organizationId, agent: "growth" }
    );

    expect(canWake).toBe(true);
  });

  test("recent agent wake detection ignores unrelated activity noise", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("autopilotActivityLog", {
        organizationId,
        agent: "cto",
        level: "action",
        message: "CTO wake is still in the cooldown window",
        createdAt: now - 60_000,
      });
      for (let index = 0; index < 60; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "system",
          level: "info",
          message: `Unrelated heartbeat noise ${index}`,
          createdAt: now + index,
        });
      }
    });

    const recentlyWoken = await t.query(
      internal.autopilot.heartbeat.isAgentRecentlyWoken,
      { organizationId, agent: "cto" }
    );

    expect(recentlyWoken).toBe(true);
  });

  test("polling releases work without contacting providers after billing access is lost", async () => {
    const t = createTestContext();
    const organizationId = await createFreeOrg(t);
    await createAutopilotConfig(t, organizationId, { adapter: "builtin" });
    await t.mutation(
      internal.autopilot.config_mutations.upsertAdapterCredentials,
      {
        organizationId,
        adapter: "builtin",
        credentials: JSON.stringify({ githubToken: "github-token" }),
      }
    );
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Downgraded polling task",
        description: "Polling should stop before provider I/O.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const runId = await t.mutation(
      internal.autopilot.task_mutations.createRun,
      { organizationId, taskId, adapter: "builtin" }
    );
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      status: "waiting_ci",
      externalRef: "builtin:acme/reflet#42",
    });
    const originalFetch = globalThis.fetch;
    const blockedFetch: typeof fetch = async () => {
      throw new Error("provider should not be polled without billing access");
    };
    globalThis.fetch = blockedFetch;

    try {
      await t.action(internal.autopilot.execution_lifecycle.pollTaskStatus, {
        organizationId,
        taskId,
        runId,
        externalRef: "builtin:acme/reflet#42",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const rows = await t.run(async (ctx) => ({
      logs: await ctx.db.query("autopilotActivityLog").collect(),
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));

    expect(rows.task?.status).toBe("backlog");
    expect(rows.run?.status).toBe("cancelled");
    expect(
      rows.logs.some((entry) =>
        entry.message.includes("Autopilot requires a Pro subscription")
      )
    ).toBe(true);
  });

  test("routine evaluation does not create tasks after billing access is lost", async () => {
    const t = createTestContext();
    const organizationId = await createFreeOrg(t);
    await createAutopilotConfig(t, organizationId);
    await t.run((ctx) =>
      ctx.db.insert("autopilotRoutines", {
        organizationId,
        title: "Daily planning",
        description: "Should not run without Pro access.",
        agent: "pm",
        cronExpression: "* * * * *",
        taskTemplate: JSON.stringify({
          title: "Routine task",
          description: "This should not be created.",
          priority: "medium",
        }),
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );
    const tasks = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect()
    );

    expect(dispatched).toBe(0);
    expect(tasks).toHaveLength(0);
  });
});
