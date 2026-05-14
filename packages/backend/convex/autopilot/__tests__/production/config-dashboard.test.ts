/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../../_generated/api";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createTestContext,
  type TestContext,
} from "../test-fixtures.helpers";

async function createFreeOrg(t: TestContext) {
  return await t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: "Free Autopilot Contract Org",
      slug: `free-autopilot-contract-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );
}

describe("autopilot production config and dashboard contracts", () => {
  test("public config initialization writes explicit safe agent defaults", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const configId = await authed.mutation(
      api.autopilot.mutations.config.initConfig,
      { organizationId }
    );

    const config = await t.run((ctx) => ctx.db.get(configId));
    expect(config?.pmEnabled).toBe(true);
    expect(config?.ctoEnabled).toBe(true);
    expect(config?.growthEnabled).toBe(false);
    expect(config?.supportEnabled).toBe(false);
    expect(config?.salesEnabled).toBe(false);
  });

  test("dashboard performance counts action logs by level", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("autopilotActivityLog", {
        organizationId,
        agent: "pm",
        level: "action",
        message: "PM started analysis",
        createdAt: now,
      });
      await ctx.db.insert("autopilotActivityLog", {
        organizationId,
        agent: "pm",
        level: "success",
        message: "PM produced tasks",
        createdAt: now + 1,
      });
    });

    const performance = await authed.query(
      api.autopilot.queries.dashboard.getAgentPerformance,
      { organizationId }
    );
    const pm = performance.find((entry) => entry.agent === "pm");

    expect(pm?.totalActions).toBe(1);
    expect(pm?.successCount).toBe(1);
    expect(pm?.successRate).toBe(1);
  });

  test("legacy configs do not enable opt-in agents by omission", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const now = Date.now();
    await t.run((ctx) =>
      ctx.db.insert("autopilotConfig", {
        organizationId,
        enabled: true,
        autonomyLevel: "review_required",
        autonomyMode: "supervised",
        maxTasksPerDay: 10,
        tasksUsedToday: 0,
        tasksResetAt: now + 24 * 60 * 60 * 1000,
        requireArchitectReview: true,
        createdAt: now,
        updatedAt: now,
      })
    );
    await t.run((ctx) =>
      ctx.db.insert("autopilotRoutines", {
        organizationId,
        title: "Growth routine",
        agent: "growth",
        cronExpression: "* * * * *",
        taskTemplate: JSON.stringify({ title: "Growth task" }),
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    );

    const gate = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "growth",
      action: "publish_content",
    });
    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    expect(gate).toEqual({ proceed: false, reason: "agent_disabled" });
    expect(dispatched).toBe(0);
  });

  test("non-Pro organizations cannot use public Autopilot CRUD mutations", async () => {
    const t = createTestContext();
    const organizationId = await createFreeOrg(t);
    await createAutopilotConfig(t, organizationId);
    const authed = await createMemberSession(t, organizationId);
    const now = Date.now();
    const [workItemId, documentId, routineId] = await t.run(async (ctx) => {
      const createdWorkItemId = await ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Downgraded task",
        description: "Must stay read-only without billing access.",
        status: "backlog",
        priority: "medium",
        needsReview: false,
        createdAt: now,
        updatedAt: now,
      });
      const createdDocumentId = await ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "note",
        title: "Downgraded document",
        content: "Must stay read-only without billing access.",
        tags: [],
        status: "draft",
        needsReview: false,
        createdAt: now,
        updatedAt: now,
      });
      const createdRoutineId = await ctx.db.insert("autopilotRoutines", {
        organizationId,
        title: "Downgraded routine",
        agent: "cto",
        cronExpression: "* * * * *",
        taskTemplate: JSON.stringify({ title: "Task" }),
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      return [createdWorkItemId, createdDocumentId, createdRoutineId];
    });
    const error = "Autopilot requires a Pro subscription.";
    const denials = [
      () =>
        authed.mutation(api.autopilot.mutations.work.createWorkItem, {
          organizationId,
          type: "task",
          title: "Blocked task",
          description: "Blocked without billing access.",
          priority: "medium",
        }),
      () =>
        authed.mutation(api.autopilot.mutations.work.updateWorkItem, {
          workItemId,
          status: "todo",
        }),
      () =>
        authed.mutation(api.autopilot.mutations.work.deleteWorkItem, {
          workItemId,
        }),
      () =>
        authed.mutation(api.autopilot.mutations.documents.createDocument, {
          organizationId,
          type: "note",
          title: "Blocked document",
          content: "Blocked without billing access.",
        }),
      () =>
        authed.mutation(api.autopilot.mutations.documents.updateDocument, {
          documentId,
          title: "Blocked update",
        }),
      () =>
        authed.mutation(api.autopilot.mutations.documents.archiveDocument, {
          documentId,
        }),
      () =>
        authed.mutation(api.autopilot.mutations.routines.createRoutine, {
          organizationId,
          title: "Blocked routine",
          agent: "cto",
          cronExpression: "* * * * *",
          taskTemplate: JSON.stringify({ title: "Task" }),
        }),
      () =>
        authed.mutation(api.autopilot.mutations.routines.updateRoutine, {
          routineId,
          enabled: false,
        }),
      () =>
        authed.mutation(api.autopilot.mutations.routines.deleteRoutine, {
          routineId,
        }),
    ];

    for (const denial of denials) {
      await expect(denial()).rejects.toThrow(error);
    }
  });

  test("guards count agent activity even when unrelated logs are noisy", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const now = Date.now();

    await t.run(async (ctx) => {
      for (let index = 0; index < 10; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "growth",
          level: "action",
          message: `Growth execution ${index}`,
          createdAt: now - 5 * 60 * 1000 + index,
        });
      }
      for (let index = 0; index < 5; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "sales",
          level: "error",
          message: `Sales failure ${index}`,
          createdAt: now - 2 * 60 * 1000 + index,
        });
      }
      for (let index = 0; index < 120; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "system",
          level: "info",
          message: `Unrelated noise ${index}`,
          createdAt: now + index,
        });
      }
    });

    const rateLimited = await t.query(internal.autopilot.guards.checkGuards, {
      organizationId,
      agent: "growth",
    });
    const circuitOpen = await t.query(internal.autopilot.guards.checkGuards, {
      organizationId,
      agent: "sales",
    });

    expect(rateLimited.allowed).toBe(false);
    expect(rateLimited.reason).toContain("Rate limit");
    expect(circuitOpen.allowed).toBe(false);
    expect(circuitOpen.reason).toContain("Circuit breaker");
  });
});
