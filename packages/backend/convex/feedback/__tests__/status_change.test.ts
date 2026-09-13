/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../schema";
import {
  scheduledFunctionNames,
  seedFeedback,
  seedGithubConnection,
  seedGithubIssue,
  seedOrganization,
} from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { changeFeedbackStatus } from "../status_change";

describe("changeFeedbackStatus", () => {
  test("sets completedAt on completion, clears it on reopen, logs each change", async () => {
    const t = convexTest(schema, modules);

    const result = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const feedbackId = await seedFeedback(ctx, organizationId, {
        claimedAt: Date.now(),
        claimedBy: "agent-1",
      });
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error("seed failed");
      }

      await changeFeedbackStatus(ctx, feedback, {
        actorId: "user-1",
        source: "user",
        status: "completed",
      });
      const completed = await ctx.db.get(feedbackId);
      if (!completed) {
        throw new Error("missing");
      }

      await changeFeedbackStatus(ctx, completed, {
        actorId: "user-1",
        source: "user",
        status: "open",
      });
      const reopened = await ctx.db.get(feedbackId);

      const logs = await ctx.db
        .query("activityLogs")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
        .collect();
      return { completed, logs, reopened };
    });

    expect(result.completed.completedAt).toBeDefined();
    expect(result.completed.claimedBy).toBeUndefined();
    expect(result.completed.claimedAt).toBeUndefined();
    expect(result.reopened?.completedAt).toBeUndefined();
    expect(result.reopened?.status).toBe("open");
    expect(result.logs).toHaveLength(2);
    expect(JSON.parse(result.logs[0].details ?? "{}")).toMatchObject({
      newStatus: "completed",
      oldStatus: "open",
      source: "user",
    });
  });

  test("is a no-op when nothing changes", async () => {
    const t = convexTest(schema, modules);

    const result = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const feedbackId = await seedFeedback(ctx, organizationId);
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error("seed failed");
      }
      const changed = await changeFeedbackStatus(ctx, feedback, {
        actorId: "system",
        source: "github",
        status: "open",
      });
      const logs = await ctx.db.query("activityLogs").collect();
      return { changed, logs };
    });

    expect(result.changed).toBe(false);
    expect(result.logs).toHaveLength(0);
  });

  test("derives the enum from the org status name and rejects foreign statuses", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const otherOrganizationId = await seedOrganization(ctx, {
        slug: "other",
      });
      const now = Date.now();
      const inProgressId = await ctx.db.insert("organizationStatuses", {
        color: "#000",
        createdAt: now,
        name: "In Progress",
        order: 1,
        organizationId,
        updatedAt: now,
      });
      const foreignStatusId = await ctx.db.insert("organizationStatuses", {
        color: "#000",
        createdAt: now,
        name: "Done",
        order: 1,
        organizationId: otherOrganizationId,
        updatedAt: now,
      });
      const feedbackId = await seedFeedback(ctx, organizationId);
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error("seed failed");
      }

      await changeFeedbackStatus(ctx, feedback, {
        actorId: "user-1",
        organizationStatusId: inProgressId,
        source: "user",
      });
      const updated = await ctx.db.get(feedbackId);
      expect(updated?.status).toBe("in_progress");
      expect(updated?.organizationStatusId).toBe(inProgressId);

      await expect(
        changeFeedbackStatus(ctx, feedback, {
          actorId: "user-1",
          organizationStatusId: foreignStatusId,
          source: "user",
        })
      ).rejects.toThrow("Invalid status for this organization");
    });
  });

  test("schedules issue creation when the connection promotes on this status", async () => {
    const t = convexTest(schema, modules);

    const scheduled = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      await seedGithubConnection(ctx, organizationId, {
        promoteStatus: "planned",
        promoteTrigger: "on_status",
      });
      const feedbackId = await seedFeedback(ctx, organizationId);
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error("seed failed");
      }

      await changeFeedbackStatus(ctx, feedback, {
        actorId: "user-1",
        source: "user",
        status: "under_review",
      });
      const beforeMatch = await scheduledFunctionNames(ctx);

      await changeFeedbackStatus(
        ctx,
        { ...feedback, status: "under_review" },
        { actorId: "user-1", source: "user", status: "planned" }
      );
      const afterMatch = await scheduledFunctionNames(ctx);
      return { afterMatch, beforeMatch };
    });

    const promotes = (names: string[]) =>
      names.filter((name) => name.includes("promoteFeedback"));
    expect(promotes(scheduled.beforeMatch)).toHaveLength(0);
    expect(promotes(scheduled.afterMatch)).toHaveLength(1);
  });

  test("closes the linked GitHub issue only while it is still open", async () => {
    const t = convexTest(schema, modules);

    const result = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const connectionId = await seedGithubConnection(ctx, organizationId);
      const openFeedbackId = await seedFeedback(ctx, organizationId);
      const closedFeedbackId = await seedFeedback(ctx, organizationId);
      await seedGithubIssue(ctx, organizationId, connectionId, {
        refletFeedbackId: openFeedbackId,
      });
      await seedGithubIssue(ctx, organizationId, connectionId, {
        githubIssueId: "issue-2",
        githubIssueNumber: 43,
        refletFeedbackId: closedFeedbackId,
        state: "closed",
      });

      for (const feedbackId of [openFeedbackId, closedFeedbackId]) {
        const feedback = await ctx.db.get(feedbackId);
        if (!feedback) {
          throw new Error("seed failed");
        }
        await changeFeedbackStatus(ctx, feedback, {
          actorId: "system",
          source: "github",
          status: "closed",
        });
      }
      const scheduled = await ctx.db.system
        .query("_scheduled_functions")
        .collect();
      return scheduled.filter((job) => job.name.includes("closeIssue"));
    });

    expect(result).toHaveLength(1);
    expect(result[0].args[0]).toMatchObject({ stateReason: "not_planned" });
  });

  test("queues a webhook delivery for subscribed hooks only", async () => {
    const t = convexTest(schema, modules);

    const deliveries = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const now = Date.now();
      const hook = {
        consecutiveFailures: 0,
        createdAt: now,
        isActive: true,
        organizationId,
        secret: "s",
        updatedAt: now,
        url: "https://example.com/hook",
      };
      await ctx.db.insert("organizationWebhooks", {
        ...hook,
        events: ["feedback.status_changed"],
      });
      await ctx.db.insert("organizationWebhooks", {
        ...hook,
        events: ["feedback.created"],
      });
      await ctx.db.insert("organizationWebhooks", {
        ...hook,
        events: ["feedback.status_changed"],
        isActive: false,
      });
      const feedbackId = await seedFeedback(ctx, organizationId);
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error("seed failed");
      }
      await changeFeedbackStatus(ctx, feedback, {
        actorId: "user-1",
        source: "user",
        status: "planned",
      });
      return await ctx.db.query("webhookDeliveries").collect();
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      attempts: 0,
      event: "feedback.status_changed",
      status: "pending",
    });
  });
});
