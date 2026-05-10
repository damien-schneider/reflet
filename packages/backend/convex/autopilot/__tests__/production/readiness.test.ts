/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../../_generated/api";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createParentTask,
  createTestContext,
  expectWorkItemId,
  getActivity,
  hasMessage,
  type TestContext,
} from "../test-fixtures.helpers";

async function createOrgSnapshot(
  t: TestContext,
  options: {
    name: string;
    slugPrefix: string;
    subscriptionStatus: "active" | "none";
    subscriptionTier: "free" | "pro";
  }
) {
  return await t.run((ctx) =>
    ctx.db.insert("organizations", {
      name: options.name,
      slug: `${options.slugPrefix}-${Date.now()}`,
      isPublic: false,
      subscriptionTier: options.subscriptionTier,
      subscriptionStatus: options.subscriptionStatus,
      createdAt: Date.now(),
    })
  );
}

describe("autopilot production readiness", () => {
  test("free organizations cannot initialize or run autopilot", async () => {
    const t = createTestContext();
    const organizationId = await createOrgSnapshot(t, {
      name: "Free Org",
      slugPrefix: "free-org",
      subscriptionTier: "free",
      subscriptionStatus: "none",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.config.initConfig, {
        organizationId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    await createAutopilotConfig(t, organizationId);
    const enabledConfigs = await t.query(
      internal.autopilot.config.getEnabledConfigs,
      {}
    );
    expect(enabledConfigs).toHaveLength(0);
  });

  test("stale pro org snapshots cannot initialize or run autopilot", async () => {
    const t = createTestContext();
    const organizationId = await createOrgSnapshot(t, {
      name: "Stale Pro Org",
      slugPrefix: "stale-pro-org",
      subscriptionTier: "pro",
      subscriptionStatus: "active",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.config.initConfig, {
        organizationId,
      })
    ).rejects.toThrow("Autopilot requires a Pro subscription.");

    await createAutopilotConfig(t, organizationId);
    const enabledConfigs = await t.query(
      internal.autopilot.config.getEnabledConfigs,
      {}
    );
    expect(enabledConfigs).toHaveLength(0);
  });

  test("execution does not consume quota after subscription access is lost", async () => {
    const t = createTestContext();
    const organizationId = await createOrgSnapshot(t, {
      name: "Downgraded Org",
      slugPrefix: "downgraded-org",
      subscriptionTier: "pro",
      subscriptionStatus: "active",
    });
    const configId = await createAutopilotConfig(t, organizationId);
    const taskId = await createParentTask(t, {
      organizationId,
      title: "Queued after downgrade",
      description: "Do not execute after billing access is lost.",
      priority: "medium",
    });
    await t.mutation(
      internal.autopilot.config_mutations.upsertAdapterCredentials,
      {
        organizationId,
        adapter: "builtin",
        credentials: JSON.stringify({ githubToken: "ghp_test" }),
      }
    );
    const originalFetch = globalThis.fetch;
    const validatingFetch: typeof fetch = async () =>
      new Response("{}", { status: 200 });
    globalThis.fetch = validatingFetch;

    try {
      await t.action(internal.autopilot.execution.executeTask, {
        organizationId,
        taskId,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const rows = await t.run(async (ctx) => ({
      config: await ctx.db.get(configId),
      task: await ctx.db.get(taskId),
    }));
    const activity = await getActivity(t);

    expect(rows.config?.tasksUsedToday).toBe(0);
    expect(rows.task?.status).toBe("backlog");
    expect(
      activity.some((entry) =>
        entry.message.includes("Autopilot requires a Pro subscription")
      )
    ).toBe(true);
  });

  test("default builtin config keeps dev disabled until a production adapter is selected", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const configId = await authed.mutation(
      api.autopilot.mutations.config.initConfig,
      { organizationId }
    );

    const rows = await t.run(async (ctx) => ({
      config: await ctx.db.get(configId),
    }));
    const enabledAgents = await t.query(
      internal.autopilot.config.getEnabledAgents,
      { organizationId }
    );

    expect(rows.config?.adapter).toBe("builtin");
    expect(rows.config?.dailyCostCapUsd).toBe(50);
    expect(rows.config?.devEnabled).toBe(false);
    expect(enabledAgents).not.toContain("dev");
  });

  test("legacy builtin configs without dev flag do not enable dev dispatch", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    const enabledAgents = await t.query(
      internal.autopilot.config.getEnabledAgents,
      { organizationId }
    );

    expect(enabledAgents).not.toContain("dev");
  });

  test("polling releases tasks when adapter credentials disappear", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { adapter: "codex" });
    const taskId = await createParentTask(t, {
      organizationId,
      title: "Poll missing credentials",
      description: "Do not leave this task stuck in progress.",
      priority: "medium",
    });
    await t.mutation(internal.autopilot.task_mutations.updateTaskStatus, {
      taskId,
      status: "in_progress",
    });
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
      externalRef: "codex:owner/repo#42",
      status: "waiting_ci",
    });

    await t.action(internal.autopilot.execution_lifecycle.pollTaskStatus, {
      organizationId,
      taskId,
      runId,
      externalRef: "codex:owner/repo#42",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));
    const activity = await getActivity(t);

    expect(rows.task?.status).toBe("backlog");
    expect(rows.run?.status).toBe("failed");
    expect(
      activity.some((entry) =>
        entry.message.includes("Polling stopped: adapter credentials missing")
      )
    ).toBe(true);
  });

  test("numeric config updates reject values that would break execution", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.mutations.config.updateConfig, {
        configId,
        maxTasksPerDay: 0,
      })
    ).rejects.toThrow("maxTasksPerDay must be at least 1");

    const config = await t.run((ctx) => ctx.db.get(configId));
    expect(config?.maxTasksPerDay).toBe(10);
  });

  test("config updates persist per-agent budget caps from settings", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const authed = await createMemberSession(t, organizationId);
    const perAgentDailyCapUsd = JSON.stringify({ cto: 15, pm: 10 });
    const budgetUpdate = { configId, perAgentDailyCapUsd };

    await authed.mutation(
      api.autopilot.mutations.config.updateConfig,
      budgetUpdate
    );

    const config = await t.run((ctx) => ctx.db.get(configId));
    expect(config?.perAgentDailyCapUsd).toBe(perAgentDailyCapUsd);
  });

  test("config updates reject invalid per-agent budget caps", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const authed = await createMemberSession(t, organizationId);
    const budgetUpdate = {
      configId,
      perAgentDailyCapUsd: JSON.stringify({ pm: -1 }),
    };

    await expect(
      authed.mutation(api.autopilot.mutations.config.updateConfig, budgetUpdate)
    ).rejects.toThrow("perAgentDailyCapUsd");
  });

  test("cto dev subtasks preserve acceptance criteria", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const parentTaskId = await createParentTask(t, {
      organizationId,
      title: "CTO spec",
      description: "Convert this into a dev task",
      priority: "high",
    });
    const acceptanceCriteria = [
      "The dev task keeps the original acceptance criteria.",
      "The dev task is assigned to the dev agent.",
    ];

    const devTaskId = expectWorkItemId(
      await t.action(internal.autopilot.agents.cto.createDevSubtask, {
        organizationId,
        parentTaskId,
        title: "Dev: Implement test",
        implementationPrompt: "Build the implementation from the CTO spec.",
        priority: "high",
        estimatedComplexity: "simple",
        acceptanceCriteria,
      })
    );
    const task = await t.query(internal.autopilot.task_queries.getTask, {
      taskId: devTaskId,
    });
    const activity = await getActivity(t);

    expect(task?.assignedAgent).toBe("dev");
    expect(task?.parentId).toBe(parentTaskId);
    expect(task?.description).toBe(
      "Build the implementation from the CTO spec."
    );
    expect(task?.acceptanceCriteria).toEqual(acceptanceCriteria);
    expect(hasMessage(activity, "Work item created: Dev: Implement test")).toBe(
      true
    );
    expect(
      hasMessage(activity, "Technical spec ready: Dev: Implement test")
    ).toBe(true);
  });

  test("cto dev subtasks respect caps without logging success", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const parentTaskId = await createParentTask(t, {
      organizationId,
      title: "CTO capped spec",
      description: "Try to create a capped dev task",
      priority: "medium",
    });
    const configId = await t.mutation(
      internal.autopilot.config_mutations.createDefaultConfig,
      { organizationId }
    );
    await t.mutation(internal.autopilot.config_mutations.updateConfig, {
      configId,
      maxPendingTasksPerAgent: 0,
      maxPendingTasksTotal: 10,
    });

    const devTaskId = await t.action(
      internal.autopilot.agents.cto.createDevSubtask,
      {
        organizationId,
        parentTaskId,
        title: "Dev: Capped implementation",
        implementationPrompt: "Build the implementation from the CTO spec.",
        priority: "medium",
        estimatedComplexity: "moderate",
        acceptanceCriteria: ["No task is created once the dev cap is reached."],
      }
    );
    const subtasks = await t.query(
      internal.autopilot.task_queries.getSubtasks,
      { parentTaskId }
    );
    const activity = await getActivity(t);

    expect(devTaskId).toBeNull();
    expect(subtasks).toHaveLength(0);
    expect(
      activity.some((entry) =>
        entry.message.includes(
          'Skipped creating work item "Dev: Capped implementation"'
        )
      )
    ).toBe(true);
    expect(
      hasMessage(activity, "Skipped dev subtask: Dev: Capped implementation")
    ).toBe(true);
    expect(
      hasMessage(activity, "Technical spec ready: Dev: Capped implementation")
    ).toBe(false);
  });

  test("execution pauses tasks without consuming quota before credentials exist", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const taskId = await createParentTask(t, {
      organizationId,
      title: "Needs credentials",
      description: "Do not consume quota before adapter setup is complete.",
      priority: "medium",
    });

    await t.action(internal.autopilot.execution.executeTask, {
      organizationId,
      taskId,
    });

    const rows = await t.run(async (ctx) => ({
      config: await ctx.db.get(configId),
      task: await ctx.db.get(taskId),
    }));
    const activity = await getActivity(t);

    expect(rows.config?.tasksUsedToday).toBe(0);
    expect(rows.task?.status).toBe("backlog");
    expect(
      activity.some((entry) =>
        entry.message.includes("Execution paused: adapter credentials missing")
      )
    ).toBe(true);
  });

  test("execution pauses tasks without consuming quota when credentials are invalid", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const taskId = await createParentTask(t, {
      organizationId,
      title: "Invalid credentials",
      description: "Do not cancel tasks when adapter setup can be fixed.",
      priority: "medium",
    });

    await t.mutation(
      internal.autopilot.config_mutations.upsertAdapterCredentials,
      {
        organizationId,
        adapter: "builtin",
        credentials: JSON.stringify({ githubToken: "invalid-token" }),
      }
    );

    const originalFetch = globalThis.fetch;
    const invalidCredentialsFetch: typeof fetch = async () =>
      new Response("{}", { status: 401 });
    globalThis.fetch = invalidCredentialsFetch;

    try {
      await t.action(internal.autopilot.execution.executeTask, {
        organizationId,
        taskId,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const rows = await t.run(async (ctx) => ({
      config: await ctx.db.get(configId),
      task: await ctx.db.get(taskId),
    }));
    const activity = await getActivity(t);

    expect(rows.config?.tasksUsedToday).toBe(0);
    expect(rows.task?.status).toBe("backlog");
    expect(
      activity.some((entry) =>
        entry.message.includes(
          "Execution paused: adapter credentials are invalid"
        )
      )
    ).toBe(true);
  });
});
