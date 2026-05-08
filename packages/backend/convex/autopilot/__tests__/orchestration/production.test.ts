/// <reference types="vite/client" />

import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createTestContext,
  type TestContext,
} from "../test-fixtures.helpers";

const jsonResponse = (body: unknown) => Response.json(body);

const getRequestUrl = (input: Parameters<typeof fetch>[0]): string => {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
};

const createDevTask = (t: TestContext, organizationId: Id<"organizations">) =>
  t.run((ctx) =>
    ctx.db.insert("autopilotWorkItems", {
      organizationId,
      type: "task",
      title: "External adapter task",
      description: "Poll the provider that owns this run.",
      status: "in_progress",
      priority: "high",
      assignedAgent: "dev",
      needsReview: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );

const createCodexRun = (
  t: TestContext,
  organizationId: Id<"organizations">,
  taskId: Id<"autopilotWorkItems">
) =>
  t.mutation(internal.autopilot.task_mutations.createRun, {
    organizationId,
    taskId,
    adapter: "codex",
  });

const upsertCodexCredentials = (
  t: TestContext,
  organizationId: Id<"organizations">
) =>
  t.mutation(internal.autopilot.config_mutations.upsertAdapterCredentials, {
    organizationId,
    adapter: "codex",
    credentials: JSON.stringify({
      githubToken: "github-token",
      openaiApiKey: "openai-key",
    }),
  });

afterEach(function restoreGlobals() {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("autopilot production orchestration", () => {
  test("create_task gate respects the daily task cap", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      maxTasksPerDay: 1,
      tasksUsedToday: 1,
      tasksResetAt: Date.now() + 60_000,
    });

    const result = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "pm",
      action: "create_task",
    });

    expect(result).toEqual({ proceed: false, reason: "plan_limit" });
  });

  test("polling uses the adapter stored on the run", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { adapter: "claude_code" });
    await upsertCodexCredentials(t, organizationId);
    const taskId = await createDevTask(t, organizationId);
    const runId = await createCodexRun(t, organizationId, taskId);
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      externalRef: "codex:acme/reflet#42",
      status: "waiting_ci",
    });

    vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = getRequestUrl(input);
      if (url.includes("/pulls?")) {
        return jsonResponse([
          {
            body: "Fixes #42",
            draft: false,
            head: { ref: "autopilot/test" },
            html_url: "https://github.com/acme/reflet/pull/7",
            number: 7,
            title: "Autopilot PR #42",
          },
        ]);
      }
      if (url.includes("/check-runs")) {
        return jsonResponse({
          check_runs: [{ conclusion: "success", status: "completed" }],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await t.action(internal.autopilot.execution_lifecycle.pollTaskStatus, {
      organizationId,
      taskId,
      runId,
      externalRef: "codex:acme/reflet#42",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));

    expect(rows.run?.status).toBe("completed");
    expect(rows.task?.status).toBe("in_review");
    expect(rows.task?.prNumber).toBe(7);
  });

  test("polling releases active runs while autopilot is stopped", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      enabled: false,
      autonomyMode: "stopped",
    });
    const taskId = await createDevTask(t, organizationId);
    const runId = await createCodexRun(t, organizationId, taskId);
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      externalRef: "codex:acme/reflet#42",
      status: "waiting_ci",
    });
    vi.stubGlobal("fetch", async () => {
      throw new Error("provider should not be polled while stopped");
    });

    await t.action(internal.autopilot.execution_lifecycle.pollTaskStatus, {
      organizationId,
      taskId,
      runId,
      externalRef: "codex:acme/reflet#42",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));

    expect(rows.run?.status).toBe("cancelled");
    expect(rows.task?.status).toBe("backlog");
  });

  test("stop mode cancels active provider runs without losing paused work", async () => {
    vi.useFakeTimers();
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { adapter: "claude_code" });
    await upsertCodexCredentials(t, organizationId);
    const authed = await createMemberSession(t, organizationId);
    const taskId = await createDevTask(t, organizationId);
    const runId = await createCodexRun(t, organizationId, taskId);
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      externalRef: "codex:acme/reflet#42",
      status: "waiting_ci",
    });
    const cancelledIssues: string[] = [];
    vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = getRequestUrl(input);
      if (url.includes("/issues/42")) {
        cancelledIssues.push(url);
        return jsonResponse({});
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await authed.mutation(api.autopilot.mutations.config.setAutonomyMode, {
      organizationId,
      mode: "stopped",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));

    expect(cancelledIssues).toHaveLength(1);
    expect(rows.run?.status).toBe("cancelled");
    expect(rows.task?.status).toBe("backlog");
  });

  test("saving adapter credentials validates them for dispatch", async () => {
    vi.useFakeTimers();
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);
    vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0]) => {
      const url = getRequestUrl(input);
      if (
        url.includes("api.github.com/user") ||
        url.includes("api.openai.com/v1/models")
      ) {
        return jsonResponse({});
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const credentialId = await authed.mutation(
      api.autopilot.mutations.config.upsertCredentials,
      {
        organizationId,
        adapter: "codex",
        credentials: JSON.stringify({
          githubToken: "github-token",
          openaiApiKey: "openai-key",
        }),
      }
    );
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const credential = await t.run((ctx) => ctx.db.get(credentialId));

    expect(credential?.isValid).toBe(true);
    expect(credential?.lastValidatedAt).toBeTypeOf("number");
  });
});
