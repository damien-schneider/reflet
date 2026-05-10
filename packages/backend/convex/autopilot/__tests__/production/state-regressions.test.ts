/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  createAutopilotConfig,
  createMemberSession,
  createOrg,
  createParentTask,
  createTestContext,
  createValidatorScore,
} from "../test-fixtures.helpers";

describe("autopilot production state regressions", () => {
  test("self-healing only preserves the stuck task with recent activity", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const staleAt = Date.now() - 3 * 60 * 60 * 1000;

    const activeTaskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Still active",
        description: "Recent task-specific activity should preserve this.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: staleAt,
        updatedAt: staleAt,
      })
    );
    const stuckTaskId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Actually stuck",
        description: "No task-specific activity should cancel this.",
        status: "in_progress",
        priority: "medium",
        assignedAgent: "dev",
        needsReview: false,
        createdAt: staleAt,
        updatedAt: staleAt,
      })
    );
    await t.run((ctx) =>
      ctx.db.insert("autopilotActivityLog", {
        organizationId,
        workItemId: activeTaskId,
        agent: "dev",
        level: "action",
        message: "Dev is still working on this task",
        createdAt: Date.now(),
      })
    );
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let index = 0; index < 51; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "system",
          level: "info",
          message: `Unrelated noisy activity ${index}`,
          createdAt: now + index,
        });
      }
    });

    await t.action(internal.autopilot.self_heal.runSelfHealing, {});

    const activeTask = await t.run((ctx) => ctx.db.get(activeTaskId));
    const stuckTask = await t.run((ctx) => ctx.db.get(stuckTaskId));
    expect(activeTask?.status).toBe("in_progress");
    expect(stuckTask?.status).toBe("cancelled");
  });

  test("reset clears chain artifacts along with task and document data", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId);
    const authed = await createMemberSession(t, organizationId);

    const personaId = await t.mutation(
      internal.autopilot.mutations.personas.createPersona,
      {
        organizationId,
        name: "Product lead",
        description: "Owns product review workflows",
        painPoints: ["Slow review loops"],
        goals: ["Ship reliable decisions"],
        alternativesConsidered: [],
        channels: ["community"],
        sourceDocIds: [],
      }
    );
    const useCaseId = await t.mutation(
      internal.autopilot.mutations.use_cases.createUseCase,
      {
        organizationId,
        title: "Review faster",
        description: "Keep approved work moving.",
        personaIds: [personaId],
        sourceDocIds: [],
      }
    );
    await t.mutation(
      internal.autopilot.mutations.community_posts.createCommunityPost,
      {
        organizationId,
        platform: "reddit",
        authorName: "Reviewer",
        content: "We need safer review automation.",
        sourceUrl: "https://example.com/review",
        matchedPersonaIds: [personaId],
        matchedUseCaseIds: [useCaseId],
      }
    );
    const feedbackId = await t.run((ctx) =>
      ctx.db.insert("feedback", {
        organizationId,
        title: "Linked feedback",
        description: "Reset should remove task links.",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const linkedTaskId = await createParentTask(t, {
      organizationId,
      title: "Linked reset task",
      description: "Task linked to feedback.",
      priority: "medium",
    });
    await t.run((ctx) =>
      ctx.db.insert("feedbackTaskLinks", {
        organizationId,
        feedbackId,
        workItemId: linkedTaskId,
        createdAt: Date.now(),
        createdBy: "test",
      })
    );

    await authed.mutation(api.autopilot.mutations.routines.resetAllData, {
      organizationId,
    });

    const rows = await t.run(async (ctx) => ({
      communityPosts: await ctx.db
        .query("autopilotCommunityPosts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
      feedbackTaskLinks: await ctx.db
        .query("feedbackTaskLinks")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
      personas: await ctx.db
        .query("autopilotPersonas")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
      useCases: await ctx.db
        .query("autopilotUseCases")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect(),
    }));

    expect(rows.personas).toHaveLength(0);
    expect(rows.useCases).toHaveLength(0);
    expect(rows.communityPosts).toHaveLength(0);
    expect(rows.feedbackTaskLinks).toHaveLength(0);
  });

  test("document creation derives review flags from final status", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);

    const pendingDocId: Id<"autopilotDocuments"> = await t.mutation(
      internal.autopilot.documents.createDocument,
      {
        organizationId,
        type: "market_research",
        title: "Needs review",
        content: "Pending documents must appear in the inbox.",
        status: "pending_review",
        needsReview: false,
      }
    );
    const draftDocId: Id<"autopilotDocuments"> = await t.mutation(
      internal.autopilot.documents.createDocument,
      {
        organizationId,
        type: "note",
        title: "Draft only",
        content: "Draft documents should not appear in the inbox.",
        status: "draft",
        needsReview: true,
      }
    );

    const rows = await t.run(async (ctx) => ({
      draftDoc: await ctx.db.get(draftDocId),
      pendingDoc: await ctx.db.get(pendingDocId),
    }));

    expect(rows.pendingDoc?.status).toBe("pending_review");
    expect(rows.pendingDoc?.needsReview).toBe(true);
    expect(rows.draftDoc?.status).toBe("draft");
    expect(rows.draftDoc?.needsReview).toBe(false);
  });

  test("tag lookups include documents beyond the first scanned page", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const now = Date.now();

    await t.run(async (ctx) => {
      for (let index = 0; index < 205; index += 1) {
        await ctx.db.insert("autopilotDocuments", {
          organizationId,
          type: "note",
          title: `Noise document ${index}`,
          content: "Not relevant to the growth follow-up query.",
          tags: ["noise"],
          status: "draft",
          needsReview: false,
          createdAt: now + index,
          updatedAt: now + index,
        });
      }

      await ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "note",
        title: "Late matching follow-up",
        content: "This must still be visible to growth agents.",
        tags: ["growth-followup"],
        status: "draft",
        needsReview: false,
        createdAt: now + 206,
        updatedAt: now + 206,
      });
    });

    const docs = await t.query(
      internal.autopilot.documents.getDocumentsByTags,
      {
        organizationId,
        tags: ["growth-followup"],
        status: "draft",
      }
    );

    expect(docs.map((doc) => doc.title)).toEqual(["Late matching follow-up"]);
  });

  test("legacy configs without cost caps do not apply a hidden default cap", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createAutopilotConfig(t, organizationId, {
      costUsedTodayUsd: 75,
      growthEnabled: true,
    });

    const result = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "growth",
      action: "publish_content",
    });

    expect(result.reason).not.toBe("cost_limit");
  });

  test("autonomy gate rate limits only count the matching action", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const configId = await createAutopilotConfig(t, organizationId);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.patch(configId, { salesEnabled: true });
      for (let index = 0; index < 3; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "sales",
          level: "action",
          action: "manual_lead_discovery",
          message: `Lead discovery action ${index}`,
          createdAt: now - index,
        });
      }
    });

    const allowed = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "sales",
      action: "send_email",
    });
    expect(allowed).toEqual({ proceed: true, reason: "requires_approval" });

    await t.run(async (ctx) => {
      for (let index = 0; index < 3; index += 1) {
        await ctx.db.insert("autopilotActivityLog", {
          organizationId,
          agent: "sales",
          level: "action",
          action: "send_email",
          message: `Email action ${index}`,
          createdAt: now + index,
        });
      }
    });

    const blocked = await t.query(internal.autopilot.gate.checkGate, {
      organizationId,
      agent: "sales",
      action: "send_email",
    });
    expect(blocked).toEqual({ proceed: false, reason: "rate_limit" });
  });

  test("validator publication advances use cases out of pending review", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);

    const useCaseId: Id<"autopilotUseCases"> = await t.mutation(
      internal.autopilot.mutations.use_cases.createUseCase,
      {
        organizationId,
        title: "Reduce review bottlenecks",
        description: "A PM can approve validated work without blocking growth.",
        personaIds: [],
        sourceDocIds: [],
      }
    );

    await t.mutation(
      internal.autopilot.agents.validator.writeUseCaseValidation,
      {
        useCaseId,
        validation: createValidatorScore("publish"),
      }
    );

    const useCase = await t.run((ctx) => ctx.db.get(useCaseId));
    expect(useCase?.status).toBe("published");
    expect(useCase?.validation?.recommendation).toBe("publish");
  });

  test("validator rejection archives use cases so the chain does not stall", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);

    const useCaseId: Id<"autopilotUseCases"> = await t.mutation(
      internal.autopilot.mutations.use_cases.createUseCase,
      {
        organizationId,
        title: "Wrong segment",
        description: "This scenario does not match the current target.",
        personaIds: [],
        sourceDocIds: [],
      }
    );

    await t.mutation(
      internal.autopilot.agents.validator.writeUseCaseValidation,
      {
        useCaseId,
        validation: createValidatorScore("reject"),
      }
    );

    const useCase = await t.run((ctx) => ctx.db.get(useCaseId));
    expect(useCase?.status).toBe("archived");
    expect(useCase?.validation?.recommendation).toBe("reject");
  });

  test("report archive clears review state so inbox counts stay consistent", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);
    const now = Date.now();
    const reportId = await t.run((ctx) =>
      ctx.db.insert("autopilotReports", {
        organizationId,
        reportType: "daily",
        title: "Pending CEO Report",
        executiveSummary: "Needs review.",
        healthScore: 82,
        sections: [],
        recommendations: [],
        sourceAgent: "ceo",
        tags: [],
        needsReview: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    await authed.mutation(api.autopilot.mutations.reports.archiveReport, {
      reportId,
    });

    const report = await t.run((ctx) => ctx.db.get(reportId));
    expect(report?.archived).toBe(true);
    expect(report?.needsReview).toBe(false);
    expect(report?.reviewedAt).toBeTypeOf("number");
  });
});
