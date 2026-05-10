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
      name: "Free Merge Webhook Org",
      slug: `free-merge-webhook-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("autopilot production merge webhooks", () => {
  test("merged PR webhook completes the matching work item", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const prUrl = "https://github.com/acme/reflet/pull/42";
    const collidingTaskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Different repository PR",
        description: "Same PR number, different repository URL.",
        status: "in_review",
        priority: "high",
        assignedAgent: "dev",
        needsReview: true,
        reviewType: "pr_review",
        prNumber: 42,
        prUrl: "https://github.com/acme/other/pull/42",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Reviewable PR",
        description: "The work item should close when GitHub reports a merge.",
        status: "in_review",
        priority: "high",
        assignedAgent: "dev",
        needsReview: true,
        reviewType: "pr_review",
        prNumber: 42,
        prUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
      prUrl,
      prNumber: 42,
    });

    await t.mutation(internal.autopilot.webhooks.handlePrMerged, {
      organizationId,
      prNumber: 42,
      prTitle: "Autopilot PR",
      prUrl,
      headRef: "autopilot/work",
      baseRef: "main",
      authorLogin: "reflet-bot",
    });

    const rows = await t.run(async (ctx) => ({
      collidingTask: await ctx.db.get(collidingTaskId),
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));
    const { collidingTask, run, task } = rows;
    expect(task?.status).toBe("done");
    expect(task?.needsReview).toBe(false);
    expect(task?.reviewType).toBeUndefined();
    expect(task?.reviewedAt).toBeTypeOf("number");
    expect(run?.status).toBe("completed");
    expect(run?.completedAt).toBeTypeOf("number");
    expect(collidingTask?.status).toBe("in_review");
    expect(collidingTask?.needsReview).toBe(true);
  });

  test("merged PR webhook completes work when the PR URL is only on the run", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const prUrl = "https://github.com/acme/reflet/pull/77";
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Run-only PR",
        description: "Provider status persisted the PR URL before the task.",
        status: "in_review",
        priority: "high",
        assignedAgent: "dev",
        needsReview: true,
        reviewType: "pr_review",
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
      externalRef: "codex:acme/reflet#77",
      prUrl,
      prNumber: 77,
    });

    await t.mutation(internal.autopilot.webhooks.handlePrMerged, {
      organizationId,
      prNumber: 77,
      prTitle: "Run-only Autopilot PR",
      prUrl,
      headRef: "autopilot/run-only",
      baseRef: "main",
      authorLogin: "reflet-bot",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));
    expect(rows.task?.status).toBe("done");
    expect(rows.task?.needsReview).toBe(false);
    expect(rows.task?.prUrl).toBe(prUrl);
    expect(rows.run?.status).toBe("completed");
    expect(rows.run?.completedAt).toBeTypeOf("number");
  });

  test("merged PR webhook does not mutate work after billing access is lost", async () => {
    const t = createTestContext();
    const organizationId = await createFreeOrg(t);
    await createAutopilotConfig(t, organizationId);
    const prUrl = "https://github.com/acme/reflet/pull/91";
    const taskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Downgraded merged PR",
        description: "Webhook should be ignored without billing access.",
        status: "in_review",
        priority: "high",
        assignedAgent: "dev",
        needsReview: true,
        reviewType: "pr_review",
        prNumber: 91,
        prUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const runId = await t.mutation(
      internal.autopilot.task_mutations.createRun,
      { organizationId, taskId, adapter: "codex" }
    );
    await t.mutation(internal.autopilot.task_mutations.updateRun, {
      runId,
      status: "waiting_ci",
      externalRef: "codex:acme/reflet#91",
      prUrl,
      prNumber: 91,
    });

    await t.mutation(internal.autopilot.webhooks.handlePrMerged, {
      organizationId,
      prNumber: 91,
      prTitle: "Downgraded merge",
      prUrl,
      headRef: "autopilot/downgraded",
      baseRef: "main",
      authorLogin: "reflet-bot",
    });

    const rows = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      task: await ctx.db.get(taskId),
    }));

    expect(rows.task?.status).toBe("in_review");
    expect(rows.task?.needsReview).toBe(true);
    expect(rows.run?.status).toBe("waiting_ci");
  });
});
