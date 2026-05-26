/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import {
  createAutopilotConfig,
  createOrg,
  createTestContext,
  type TestContext,
} from "./test-fixtures.helpers";

async function createReviewItem(
  t: TestContext,
  options: {
    branch: string;
    organizationId: Awaited<ReturnType<typeof createOrg>>;
    title: string;
  }
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("autopilotWorkItems", {
      organizationId: options.organizationId,
      type: "task",
      title: options.title,
      description: "Pending human review",
      status: "in_review",
      priority: "medium",
      assignedRole: "support",
      branch: options.branch,
      needsReview: true,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function createSupportTask(
  t: TestContext,
  options: {
    branch: string;
    organizationId: Awaited<ReturnType<typeof createOrg>>;
    title: string;
  }
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("autopilotWorkItems", {
      organizationId: options.organizationId,
      type: "task",
      title: options.title,
      description: "Ready support task",
      status: "todo",
      priority: "medium",
      assignedRole: "support",
      branch: options.branch,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("autopilot runtime executions", () => {
  test("runtime state is driven by durable executions, not activity logs", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    const executionId = await t.mutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId,
        role: "cto",
        triggerReason: "dependency_ready",
        actionKind: "chain_producer",
        title: "Produce codebase understanding",
        chainNode: "codebase_understanding",
      }
    );
    await t.mutation(internal.autopilot.runtime.lifecycle.markRunning, {
      executionId,
    });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotActivityLog", {
        organizationId,
        role: "cto",
        level: "success",
        message: "Old activity success should not close the execution",
        createdAt: now,
      });
    });

    const runtime = await t.query(
      internal.autopilot.runtime.queries.getRuntimeStateInternal,
      { organizationId, baseUrl: "/dashboard/acme/autopilot" }
    );
    const cto = runtime.roles.find((role) => role.role === "cto");

    expect(cto?.state).toBe("working");
    expect(cto?.currentAction?.id).toBe(executionId);
    expect(
      await t.query(
        internal.autopilot.runtime.lifecycle.hasOpenExecutionForRole,
        { organizationId, role: "cto" }
      )
    ).toBe(true);
  });

  test("failed executions surface terminal failure and retry metadata", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    const executionId = await t.mutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId,
        role: "growth",
        triggerReason: "stale_artifact",
        actionKind: "refresh_deliverable",
        title: "Refresh market analysis",
        chainNode: "market_analysis",
      }
    );
    await t.mutation(internal.autopilot.runtime.lifecycle.markFailed, {
      executionId,
      errorMessage: "Producer threw deterministic test error",
    });

    const runtime = await t.query(
      internal.autopilot.runtime.queries.getRuntimeStateInternal,
      { organizationId, baseUrl: "/dashboard/acme/autopilot" }
    );
    const growth = runtime.roles.find((role) => role.role === "growth");

    expect(growth?.lastFailure?.status).toBe("failed");
    expect(growth?.lastFailure?.errorMessage).toBe(
      "Producer threw deterministic test error"
    );
    expect(growth?.lastFailure?.nextRetryAt).toBeTypeOf("number");
  });
});

describe("autopilot runtime review gates", () => {
  test("review gates block only dependent branches", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { supportEnabled: true });

    for (let index = 0; index < 5; index += 1) {
      await createReviewItem(t, {
        organizationId,
        branch: "feature/checkout",
        title: `Checkout review ${index}`,
      });
    }
    await createSupportTask(t, {
      organizationId,
      branch: "feature/onboarding",
      title: "Onboarding support task",
    });

    const unrelated = await t.query(
      internal.autopilot.role_schedule.getRoleScheduleInternal,
      { organizationId }
    );
    expect(unrelated.find((entry) => entry.role === "support")?.state).toBe(
      "ready"
    );

    const blockedOrganizationId = await createOrg(t);
    await createAutopilotConfig(t, blockedOrganizationId, {
      supportEnabled: true,
    });
    for (let index = 0; index < 5; index += 1) {
      await createReviewItem(t, {
        organizationId: blockedOrganizationId,
        branch: "feature/checkout",
        title: `Blocked checkout review ${index}`,
      });
    }
    await createSupportTask(t, {
      organizationId: blockedOrganizationId,
      branch: "feature/checkout",
      title: "Checkout support task",
    });
    const dependent = await t.query(
      internal.autopilot.role_schedule.getRoleScheduleInternal,
      { organizationId: blockedOrganizationId }
    );
    const support = dependent.find((entry) => entry.role === "support");

    expect(support?.state).toBe("blocked");
    expect(
      support?.blockers.some(
        (blocker) =>
          blocker.kind === "review_gate" &&
          blocker.branch === "feature/checkout" &&
          blocker.count === 5 &&
          blocker.limit === 5
      )
    ).toBe(true);
  });
});

describe("autopilot runtime role-skill contract", () => {
  test("schedule exposes role skills as runtime capabilities", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    const schedule = await t.query(
      internal.autopilot.role_schedule.getRoleScheduleInternal,
      { organizationId }
    );
    const growth = schedule.find((entry) => entry.role === "growth");

    expect(growth?.state).toBe("blocked");
    expect(growth?.blockers.some((b) => b.kind === "role_disabled")).toBe(true);
  });
});
