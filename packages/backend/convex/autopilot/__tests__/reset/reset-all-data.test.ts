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
      "Work and review history",
      "Generated artifacts",
      "Market and customer intelligence",
      "Agent conversations and memory",
      "Automation settings",
      "Project context",
    ]);
    expect(scope.flatMap((group) => group.items)).toEqual(
      expect.arrayContaining([
        "Work items",
        "Activity logs",
        "Knowledge versions",
        "Agent messages",
        "Autopilot configuration",
      ])
    );
  });

  test("clears org-owned agent messages even when parent links drift", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const otherOrganizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    await createAutopilotConfig(t, otherOrganizationId);
    const authed = await createMemberSession(t, organizationId);

    await createParentTask(t, {
      organizationId: otherOrganizationId,
      title: "Other org task",
      description: "A valid task in another organization.",
      priority: "medium",
    });
    const otherThreadId = await t.run((ctx) =>
      ctx.db.insert("autopilotAgentThreads", {
        organizationId: otherOrganizationId,
        agent: "cto",
        threadId: "other-thread",
        createdAt: Date.now(),
      })
    );

    await t.run(async (ctx) => {
      const now = Date.now();
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
    }));

    expect(remaining.messages).toHaveLength(0);
  });
});
