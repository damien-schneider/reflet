/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../../_generated/api";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createParentTask,
  createTestContext,
} from "../test-fixtures.helpers";

describe("autopilot reset all data", () => {
  test("publishes the reset scope used by the confirmation dialog", async () => {
    const t = createTestContext();

    const scope = await t.query(
      api.autopilot.mutations.routines.getResetScope,
      {}
    );

    expect(scope.map((group) => group.title)).toEqual([
      "Execution and review history",
      "Generated artifacts",
      "Market and customer intelligence",
      "Agent conversations and memory",
      "Automation settings",
      "Project context",
    ]);
    expect(scope.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([
        "Work items",
        "Runs",
        "Activity logs",
        "Knowledge versions",
        "Agent messages",
        "Autopilot configuration",
      ])
    );
  });

  test("clears org-owned runs and agent messages even when parent links drift", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const otherOrganizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    await createAutopilotConfig(t, otherOrganizationId);
    const authed = await createMemberSession(t, organizationId);

    const otherTaskId = await createParentTask(t, {
      organizationId: otherOrganizationId,
      title: "Other org task",
      description: "A valid task in another organization.",
      priority: "medium",
    });
    const otherThreadId = await t.run((ctx) =>
      ctx.db.insert("autopilotAgentThreads", {
        organizationId: otherOrganizationId,
        agent: "dev",
        threadId: "other-thread",
        createdAt: Date.now(),
      })
    );

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotRuns", {
        organizationId,
        workItemId: otherTaskId,
        adapter: "builtin",
        status: "coding",
        tokensUsed: 10,
        estimatedCostUsd: 0.05,
        startedAt: now,
      });
      await ctx.db.insert("autopilotAgentMessages", {
        organizationId,
        threadId: otherThreadId,
        role: "agent",
        content: "Message belongs to the reset organization.",
        createdAt: now,
      });
    });

    await authed.mutation(api.autopilot.mutations.routines.resetAllData, {
      organizationId,
    });

    const remaining = await t.run(async (ctx) => ({
      messages: await ctx.db
        .query("autopilotAgentMessages")
        .withIndex("by_org_thread", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
      runs: await ctx.db
        .query("autopilotRuns")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
    }));

    expect(remaining.messages).toHaveLength(0);
    expect(remaining.runs).toHaveLength(0);
  });
});
