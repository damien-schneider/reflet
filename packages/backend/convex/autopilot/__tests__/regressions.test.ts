/// <reference types="vite/client" />
import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import {
  CONVEX_INTEGRATION_TEST_TIMEOUT_MS,
  modules,
} from "../../test.helpers";
import { getPMAssignableAgents } from "../agents/pm/analysis";
import {
  resolveCompletionStatus,
  resolveRetryDelayMs,
} from "../execution_policy";

const readDocId = (doc: { _id: string }) => doc._id;

const createTestContext = () => convexTest(schema, modules);
type TestContext = ReturnType<typeof createTestContext>;

const createOrg = async (t: TestContext) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: `test-org-${Date.now()}`,
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );

const createMemberSession = async (
  t: TestContext,
  organizationId: Id<"organizations">,
  role: "admin" | "member" | "owner" = "admin"
) => {
  t.registerComponent(
    "betterAuth",
    betterAuthTest.schema,
    betterAuthTest.modules
  );
  const now = Date.now();
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Autopilot Reviewer",
        email: `autopilot-reviewer-${now}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  });
  const userId = readDocId(user);
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId,
        token: `session-${now}`,
        expiresAt: now + 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  });
  const sessionId = readDocId(session);

  await t.run(async (ctx) => {
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId,
      role,
      createdAt: now,
    });
  });

  return t.withIdentity({ subject: userId, sessionId });
};

interface ConfigOverrides {
  autoMergePRs?: boolean;
  autonomyMode?: "supervised" | "full_auto" | "stopped";
  ceoChatThreadId?: string;
  dailyCostCapUsd?: number;
  enabled?: boolean;
  maxPendingTasksPerAgent?: number;
  maxPendingTasksTotal?: number;
  maxTasksPerDay?: number;
  salesEnabled?: boolean;
  stoppedAt?: number;
  tasksResetAt?: number;
  tasksUsedToday?: number;
}

const createAutopilotConfig = async (
  t: TestContext,
  organizationId: Id<"organizations">,
  overrides: ConfigOverrides = {}
) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotConfig", {
      organizationId,
      enabled: true,
      adapter: "builtin",
      autonomyLevel: "review_required",
      autonomyMode: "supervised",
      autoMergePRs: false,
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + 24 * 60 * 60 * 1000,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  });

interface WorkItemInput {
  assignedAgent?: "pm" | "cto" | "dev";
  needsReview?: boolean;
  organizationId: Id<"organizations">;
  prUrl?: string;
  reviewedAt?: number;
  reviewType?: string;
  status?:
    | "backlog"
    | "cancelled"
    | "done"
    | "in_progress"
    | "in_review"
    | "todo";
  title?: string;
  updatedAt?: number;
}

const createWorkItem = async (t: TestContext, input: WorkItemInput) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotWorkItems", {
      organizationId: input.organizationId,
      type: "task",
      title: input.title ?? "Review task",
      description: "Regression coverage task",
      status: input.status ?? "todo",
      priority: "medium",
      assignedAgent: input.assignedAgent ?? "pm",
      needsReview: input.needsReview ?? false,
      prUrl: input.prUrl,
      reviewedAt: input.reviewedAt,
      reviewType: input.reviewType,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  });

const createValidatorScore = (
  recommendation: "publish" | "reject" | "revise"
) => ({
  audienceBreadth: 70,
  composite: recommendation === "publish" ? 75 : 45,
  cost: 80,
  devComplexity: 80,
  maintainability: 80,
  rationale: "Relevant test artifact",
  recommendation,
  scoredAt: Date.now(),
  utility: recommendation === "publish" ? 80 : 40,
});

interface DocumentInput {
  needsReview: boolean;
  organizationId: Id<"organizations">;
  reviewedAt?: number;
  title?: string;
  type?: "email" | "note";
  updatedAt?: number;
}

const createDocument = async (t: TestContext, input: DocumentInput) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotDocuments", {
      organizationId: input.organizationId,
      type: input.type ?? "note",
      title: input.title ?? "Review document",
      content: "Document content",
      tags: [],
      sourceAgent: "growth",
      status: input.needsReview ? "pending_review" : "published",
      needsReview: input.needsReview,
      reviewedAt: input.reviewedAt,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  });

interface ReportInput {
  acknowledgedAt?: number;
  archived?: boolean;
  needsReview: boolean;
  organizationId: Id<"organizations">;
  title?: string;
  updatedAt?: number;
}

const createReport = async (t: TestContext, input: ReportInput) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotReports", {
      organizationId: input.organizationId,
      reportType: "daily",
      title: input.title ?? "Daily Autopilot Report",
      executiveSummary: "Autopilot needs review.",
      healthScore: 82,
      sections: [],
      recommendations: [],
      sourceAgent: "ceo",
      tags: [],
      needsReview: input.needsReview,
      acknowledgedAt: input.acknowledgedAt,
      reviewedAt: input.acknowledgedAt,
      archived: input.archived ?? false,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  });

interface RoutineInput {
  agent?: "pm" | "sales";
  organizationId: Id<"organizations">;
  taskTemplate?: string;
  title?: string;
}

const createRoutine = async (t: TestContext, input: RoutineInput) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotRoutines", {
      organizationId: input.organizationId,
      title: input.title ?? "Daily review",
      description: "Routine coverage",
      agent: input.agent ?? "pm",
      cronExpression: "* * * * *",
      taskTemplate:
        input.taskTemplate ??
        JSON.stringify({
          title: "Daily review task",
          description: "Routine-created task",
          priority: "high",
        }),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  });

const createSupportConversation = async (
  t: TestContext,
  organizationId: Id<"organizations">
) =>
  t.run(async (ctx) => {
    const now = Date.now();
    const conversationId = await ctx.db.insert("supportConversations", {
      organizationId,
      userId: "support-user",
      subject: "Need help with Autopilot",
      status: "open",
      lastMessageAt: now,
      userUnreadCount: 0,
      adminUnreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("supportMessages", {
      conversationId,
      senderId: "support-user",
      senderType: "user",
      body: "Autopilot is not doing what I expected.",
      isRead: false,
      createdAt: now,
    });

    return conversationId;
  });

describe("autopilot regressions", () => {
  test("PM analysis does not route work directly to PM or Dev", () => {
    expect(
      getPMAssignableAgents(["pm", "cto", "dev", "growth", "support", "sales"])
    ).toEqual(["cto", "growth", "support", "sales"]);
  });

  test(
    "chain state requires backend authorization",
    async () => {
      const t = createTestContext();
      const organizationId = await createOrg(t);

      await expect(
        t.query(api.autopilot.queries.chain.getChainStatePublic, {
          organizationId,
        })
      ).rejects.toThrow();
    },
    CONVEX_INTEGRATION_TEST_TIMEOUT_MS
  );

  test("resuming Autopilot redispatches paused backlog work", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, { autonomyMode: "stopped" });
    const workItemId = await createWorkItem(t, {
      organizationId,
      status: "backlog",
      assignedAgent: "pm",
    });

    await t.mutation(internal.autopilot.autonomy.setAutonomyMode, {
      organizationId,
      mode: "supervised",
    });

    const workItem = await t.run(async (ctx) => ctx.db.get(workItemId));
    expect(workItem?.status).toBe("todo");
  });

  test(
    "public autonomy resume restores backlog without skipping through todo",
    async () => {
      const t = createTestContext();
      const organizationId = await createOrg(t);
      const stoppedAt = Date.now() - 60_000;
      await createAutopilotConfig(t, organizationId, {
        autonomyMode: "stopped",
        stoppedAt,
      });
      const workItemId = await createWorkItem(t, {
        organizationId,
        status: "backlog",
        assignedAgent: "pm",
      });
      const authed = await createMemberSession(t, organizationId);

      await authed.mutation(api.autopilot.mutations.config.setAutonomyMode, {
        organizationId,
        mode: "supervised",
      });

      const workItem = await t.run(async (ctx) => ctx.db.get(workItemId));
      const config = await t.run(async (ctx) =>
        ctx.db
          .query("autopilotConfig")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organizationId)
          )
          .unique()
      );

      expect(workItem?.status).toBe("todo");
      expect(config?.autonomyMode).toBe("supervised");
      expect(config?.stoppedAt).toBeUndefined();
    },
    CONVEX_INTEGRATION_TEST_TIMEOUT_MS
  );

  test("CEO chat mutations reject threads from another organization", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      ceoChatThreadId: "owned-thread",
    });
    const authed = await createMemberSession(t, organizationId);

    await expect(
      authed.mutation(api.autopilot.ceo_chat.sendMessage, {
        organizationId,
        threadId: "foreign-thread",
        prompt: "Summarize Autopilot state.",
      })
    ).rejects.toThrow("CEO chat thread does not belong to this organization");
  });

  test("CEO chat write path requires an admin or owner", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      ceoChatThreadId: "owned-thread",
    });
    const authed = await createMemberSession(t, organizationId, "member");

    await expect(
      authed.mutation(api.autopilot.ceo_chat.sendMessage, {
        organizationId,
        threadId: "owned-thread",
        prompt: "Create a high-priority task.",
      })
    ).rejects.toThrow("Admin or owner role required");
  });

  test("CEO review tool rejects report IDs from another organization", async () => {
    const t = createTestContext();
    const scopedOrgId = await createOrg(t);
    const foreignOrgId = await createOrg(t);
    await createAutopilotConfig(t, scopedOrgId);
    await createAutopilotConfig(t, foreignOrgId);
    const foreignReportId = await createReport(t, {
      organizationId: foreignOrgId,
      needsReview: true,
      title: "Foreign report",
    });

    await expect(
      t.mutation(internal.autopilot.agents.ceo_tools.approveInboxItemForOrg, {
        organizationId: scopedOrgId,
        itemId: foreignReportId,
        itemType: "report",
        decision: "approved",
      })
    ).rejects.toThrow("Review item does not belong to this organization");

    const foreignReport = await t.run(async (ctx) =>
      ctx.db.get(foreignReportId)
    );
    expect(foreignReport?.needsReview).toBe(true);
    expect(foreignReport?.acknowledgedAt).toBeUndefined();
  });

  test("health and dashboard counts include report approvals", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      maxPendingTasksPerAgent: 3,
      maxPendingTasksTotal: 9,
    });
    await createReport(t, { organizationId, needsReview: true });
    const authed = await createMemberSession(t, organizationId);

    const health = await authed.query(api.autopilot.health.getSystemHealth, {
      organizationId,
    });
    const stats = await authed.query(
      api.autopilot.queries.dashboard.getDashboardStats,
      { organizationId }
    );

    expect(health.pendingApprovalCount).toBe(1);
    expect(stats.pendingReviewCount).toBe(1);
    expect(Reflect.get(stats, "maxPendingTasksPerAgent")).toBe(3);
    expect(Reflect.get(stats, "maxPendingTasksTotal")).toBe(9);
  });

  test("daily task guard allows dispatch after reset time has passed", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      maxTasksPerDay: 1,
      tasksResetAt: Date.now() - 1000,
      tasksUsedToday: 1,
    });

    const guard = await t.query(internal.autopilot.guards.checkGuards, {
      organizationId,
      agent: "pm",
    });

    expect(guard.allowed).toBe(true);
  });

  test("unvalidated community posts wake the validator", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    await t.run(async (ctx) => {
      const now = Date.now();
      const personaId = await ctx.db.insert("autopilotPersonas", {
        organizationId,
        name: "Founder",
        description: "Runs product discovery",
        painPoints: ["Too much manual feedback triage"],
        goals: ["Close the loop faster"],
        alternativesConsidered: ["Spreadsheets"],
        channels: ["reddit"],
        sourceDocIds: [],
        createdAt: now,
        updatedAt: now,
      });
      const useCaseId = await ctx.db.insert("autopilotUseCases", {
        organizationId,
        title: "Prioritize customer feedback",
        description: "Find the next highest leverage improvement",
        personaIds: [personaId],
        triggerScenario: "Feedback backlog is growing",
        expectedOutcome: "Clear priority list",
        sourceDocIds: [],
        status: "published",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("autopilotCommunityPosts", {
        organizationId,
        platform: "reddit",
        authorName: "founder42",
        title: "How do you triage feedback?",
        content: "We are drowning in feedback and need a better workflow.",
        sourceUrl: "https://reddit.com/r/saas/comments/triage",
        matchedPersonaIds: [personaId],
        matchedUseCaseIds: [useCaseId],
        discoveredAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const wake = await t.query(
      internal.autopilot.heartbeat_conditions.checkWakeConditions,
      { organizationId }
    );
    expect(wake.shouldWake.validator).toBe(true);
  });

  test("community draft context only includes validated publishable posts", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotCommunityPosts", {
        organizationId,
        platform: "reddit",
        authorName: "ready",
        content: "I need a better way to close feedback loops.",
        sourceUrl: "https://reddit.com/r/saas/comments/ready",
        matchedPersonaIds: [],
        matchedUseCaseIds: [],
        validation: createValidatorScore("publish"),
        discoveredAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("autopilotCommunityPosts", {
        organizationId,
        platform: "reddit",
        authorName: "not-ready",
        content: "Barely relevant.",
        sourceUrl: "https://reddit.com/r/saas/comments/not-ready",
        matchedPersonaIds: [],
        matchedUseCaseIds: [],
        validation: createValidatorScore("revise"),
        discoveredAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const context = await t.query(
      internal.autopilot.agents.growth.drafts.producer.getCommunityDraftContext,
      { organizationId }
    );

    expect(context.chainState.community_posts).toBe("published");
    expect(context.chainState.drafts).toBe("missing");
    expect(context.posts).toHaveLength(1);
    expect(context.posts[0]?.sourceUrl).toBe(
      "https://reddit.com/r/saas/comments/ready"
    );
  });

  test("support wake signal uses untriaged support conversations, not support draft documents", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "support_thread",
        title: "Reply draft: old-conversation",
        content: "Draft reply",
        tags: ["support"],
        sourceAgent: "support",
        status: "draft",
        needsReview: true,
        reviewType: "support_reply",
        metadata: JSON.stringify({ conversationId: "old-conversation" }),
        createdAt: now,
        updatedAt: now,
      });
    });

    const draftOnly = await t.query(
      internal.autopilot.heartbeat_conditions.checkWakeConditions,
      { organizationId }
    );
    expect(draftOnly.shouldWake.support).toBe(false);

    const conversationId = await createSupportConversation(t, organizationId);
    const untriaged = await t.query(
      internal.autopilot.heartbeat_conditions.checkWakeConditions,
      { organizationId }
    );
    expect(untriaged.shouldWake.support).toBe(true);

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "support_thread",
        title: `Reply draft: ${conversationId}`,
        content: "Draft reply",
        tags: ["support"],
        sourceAgent: "support",
        status: "draft",
        needsReview: true,
        reviewType: "support_reply",
        metadata: JSON.stringify({ conversationId }),
        createdAt: now,
        updatedAt: now,
      });
    });

    const triaged = await t.query(
      internal.autopilot.heartbeat_conditions.checkWakeConditions,
      { organizationId }
    );
    expect(triaged.shouldWake.support).toBe(false);
  });

  test("routine evaluation creates due tasks only for runnable agents", async () => {
    const t = createTestContext();
    const activeOrgId = await createOrg(t);
    const stoppedOrgId = await createOrg(t);
    const disabledSalesOrgId = await createOrg(t);
    await createAutopilotConfig(t, activeOrgId);
    await createAutopilotConfig(t, stoppedOrgId, { autonomyMode: "stopped" });
    await createAutopilotConfig(t, disabledSalesOrgId, {
      salesEnabled: false,
    });
    await createRoutine(t, { organizationId: activeOrgId });
    await createRoutine(t, { organizationId: stoppedOrgId });
    await createRoutine(t, {
      organizationId: disabledSalesOrgId,
      agent: "sales",
    });

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    const activeTasks = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", activeOrgId)
        )
        .collect()
    );
    const stoppedTasks = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", stoppedOrgId)
        )
        .collect()
    );
    const disabledTasks = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", disabledSalesOrgId)
        )
        .collect()
    );

    expect(dispatched).toBe(1);
    expect(activeTasks).toHaveLength(1);
    expect(activeTasks[0].title).toBe("Daily review task");
    expect(activeTasks[0].priority).toBe("high");
    expect(stoppedTasks).toHaveLength(0);
    expect(disabledTasks).toHaveLength(0);
  });

  test("disabled configs are excluded from active heartbeat orgs", async () => {
    const t = createTestContext();
    const disabledOrgId = await createOrg(t);
    const activeOrgId = await createOrg(t);
    await createAutopilotConfig(t, disabledOrgId, { enabled: false });
    await createAutopilotConfig(t, activeOrgId);

    const enabledConfigs = await t.query(
      internal.autopilot.config.getEnabledConfigs,
      {}
    );

    expect(enabledConfigs.map((config) => config.organizationId)).toEqual([
      activeOrgId,
    ]);
  });

  test("routine evaluation does not mark capped tasks as dispatched", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      maxPendingTasksPerAgent: 0,
      maxPendingTasksTotal: 0,
    });
    const routineId = await createRoutine(t, { organizationId });

    const dispatched = await t.mutation(
      internal.autopilot.routines.evaluateRoutines,
      {}
    );

    const routine = await t.run((ctx) => ctx.db.get(routineId));
    const tasks = await t.run((ctx) =>
      ctx.db
        .query("autopilotWorkItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect()
    );

    expect(dispatched).toBe(0);
    expect(routine?.lastRunAt).toBeUndefined();
    expect(tasks).toHaveLength(0);
  });

  test("resolved inbox queries return resolved review items", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    await createReport(t, {
      organizationId,
      needsReview: false,
      acknowledgedAt: Date.now(),
    });
    const authed = await createMemberSession(t, organizationId);

    const items = await authed.query(
      api.autopilot.queries.inbox.listInboxItems,
      { organizationId, reviewState: "resolved" }
    );

    expect(items).toHaveLength(1);
    expect(items[0]._source).toBe("report");
    expect(items[0].needsReview).toBe(false);
  });

  test("pending inbox returns mixed review sources and excludes archived reports", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    await createWorkItem(t, {
      organizationId,
      needsReview: true,
      title: "Approve work",
      updatedAt: 1000,
    });
    await createDocument(t, {
      organizationId,
      needsReview: true,
      title: "Approve document",
      updatedAt: 3000,
    });
    await createReport(t, {
      organizationId,
      needsReview: true,
      title: "Approve report",
      updatedAt: 2000,
    });
    await createReport(t, {
      organizationId,
      archived: true,
      needsReview: true,
      title: "Archived report",
      updatedAt: 4000,
    });
    const authed = await createMemberSession(t, organizationId);

    const allItems = await authed.query(
      api.autopilot.queries.inbox.listInboxItems,
      { organizationId, reviewState: "pending" }
    );
    const reports = await authed.query(
      api.autopilot.queries.inbox.listInboxItems,
      { organizationId, reviewState: "pending", source: "report" }
    );

    expect(allItems.map((item) => item.title)).toEqual([
      "Approve document",
      "Approve report",
      "Approve work",
    ]);
    expect(allItems.map((item) => item._source)).toEqual([
      "document",
      "report",
      "work",
    ]);
    expect(reports).toHaveLength(1);
    expect(reports[0].title).toBe("Approve report");
  });

  test("approving PR review work marks it done and clears review metadata", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const workItemId = await createWorkItem(t, {
      organizationId,
      needsReview: true,
      prUrl: "https://github.com/reflet/reflet/pull/42",
      reviewType: "pr_review",
      status: "in_review",
    });
    const authed = await createMemberSession(t, organizationId);

    await authed.mutation(api.autopilot.mutations.inbox.approveWorkItem, {
      workItemId,
    });

    const item = await t.run((ctx) => ctx.db.get(workItemId));
    expect(item?.status).toBe("done");
    expect(item?.needsReview).toBe(false);
    expect(item?.reviewType).toBeUndefined();
    expect(item?.reviewedAt).toBeTypeOf("number");
  });

  test("document status transitions keep review flags consistent", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const documentId = await createDocument(t, {
      organizationId,
      needsReview: false,
      title: "Draft brief",
    });
    const authed = await createMemberSession(t, organizationId);

    await authed.mutation(api.autopilot.mutations.documents.updateDocument, {
      documentId,
      status: "pending_review",
    });
    const pending = await t.run((ctx) => ctx.db.get(documentId));

    await authed.mutation(api.autopilot.mutations.documents.updateDocument, {
      documentId,
      status: "published",
    });
    const published = await t.run((ctx) => ctx.db.get(documentId));

    await authed.mutation(api.autopilot.mutations.documents.archiveDocument, {
      documentId,
    });
    const archived = await t.run((ctx) => ctx.db.get(documentId));

    expect(pending?.needsReview).toBe(true);
    expect(pending?.reviewedAt).toBeUndefined();
    expect(published?.needsReview).toBe(false);
    expect(published?.reviewedAt).toBeTypeOf("number");
    expect(published?.publishedAt).toBeUndefined();
    expect(archived?.needsReview).toBe(false);
  });

  test("approving outbound documents keeps them eligible for delivery action", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const documentId = await createDocument(t, {
      organizationId,
      needsReview: true,
      title: "Approved outreach",
      type: "email",
    });
    const authed = await createMemberSession(t, organizationId);

    await authed.mutation(api.autopilot.mutations.inbox.approveDocument, {
      documentId,
    });

    const doc = await t.run((ctx) => ctx.db.get(documentId));
    expect(doc?.status).toBe("published");
    expect(doc?.needsReview).toBe(false);
    expect(doc?.publishedAt).toBeUndefined();
  });

  test("completion status follows autonomy mode when auto merge is enabled", () => {
    expect(
      resolveCompletionStatus({
        autoMergePRs: true,
        autonomyLevel: "review_required",
        autonomyMode: "full_auto",
      })
    ).toBe("done");

    expect(
      resolveCompletionStatus({
        autoMergePRs: true,
        autonomyLevel: "review_required",
        autonomyMode: "supervised",
      })
    ).toBe("in_review");

    expect(
      resolveCompletionStatus({
        autoMergePRs: false,
        autonomyLevel: "full_auto",
        autonomyMode: "full_auto",
      })
    ).toBe("in_review");
  });

  test("execution retries use bounded exponential backoff", () => {
    expect(resolveRetryDelayMs({ retryCount: 0 })).toBe(5 * 60 * 1000);
    expect(resolveRetryDelayMs({ retryCount: 1 })).toBe(10 * 60 * 1000);
    expect(resolveRetryDelayMs({ retryCount: 3 })).toBeNull();
  });

  test("manual retry sends cancelled tasks to the dispatchable queue", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const workItemId = await createWorkItem(t, {
      organizationId,
      status: "cancelled",
    });
    const authed = await createMemberSession(t, organizationId);

    await authed.mutation(api.autopilot.mutations.work.updateWorkItem, {
      workItemId,
      status: "todo",
    });

    const item = await t.run((ctx) => ctx.db.get(workItemId));
    expect(item?.status).toBe("todo");
  });

  test("recorded agent costs stop the next guarded wake", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      dailyCostCapUsd: 0.01,
    });

    await t.mutation(internal.autopilot.cost_guard.recordCost, {
      organizationId,
      costUsd: 0.02,
    });

    const guard = await t.query(internal.autopilot.guards.checkGuards, {
      organizationId,
      agent: "pm",
    });

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("Daily cost cap reached");
  });
});
