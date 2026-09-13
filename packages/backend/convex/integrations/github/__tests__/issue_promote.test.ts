/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import schema from "../../../schema";
import {
  seedFeedback,
  seedGithubConnection,
  seedGithubIssue,
  seedOrganization,
} from "../../../test.fixtures";
import { modules } from "../../../test.helpers";

const createdIssue = {
  createdAt: 1,
  htmlUrl: "https://github.com/acme/app/issues/42",
  id: "issue-1",
  labels: ["bug"],
  number: 42,
  state: "open" as const,
  title: "Draft lost on save",
  updatedAt: 2,
};

describe("linkGithubIssue", () => {
  test("reuses a row the webhook inserted first and links the feedback", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const connectionId = await seedGithubConnection(ctx, organizationId);
      const feedbackId = await seedFeedback(ctx, organizationId);
      const rowId = await seedGithubIssue(ctx, organizationId, connectionId);
      return { connectionId, feedbackId, organizationId, rowId };
    });

    await t.mutation(
      internal.integrations.github.issue_promote.linkGithubIssue,
      {
        connectionId: ids.connectionId,
        feedbackId: ids.feedbackId,
        issue: createdIssue,
      }
    );

    const result = await t.run(async (ctx) => ({
      feedback: await ctx.db.get(ids.feedbackId),
      logs: await ctx.db.query("activityLogs").collect(),
      rows: await ctx.db.query("githubIssues").collect(),
    }));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].refletFeedbackId).toBe(ids.feedbackId);
    expect(result.feedback).toMatchObject({
      githubHtmlUrl: createdIssue.htmlUrl,
      githubIssueId: "issue-1",
      githubIssueNumber: 42,
    });
    expect(result.logs.map((log) => log.action)).toEqual([
      "github_issue_linked",
    ]);
  });

  test("refuses to relink feedback bound to another issue", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const connectionId = await seedGithubConnection(ctx, organizationId);
      const feedbackId = await seedFeedback(ctx, organizationId, {
        githubIssueId: "issue-other",
      });
      return { connectionId, feedbackId };
    });

    await expect(
      t.mutation(internal.integrations.github.issue_promote.linkGithubIssue, {
        connectionId: ids.connectionId,
        feedbackId: ids.feedbackId,
        issue: createdIssue,
      })
    ).rejects.toThrow("already linked to another GitHub issue");
  });
});

describe("autoImportIssueToFeedback", () => {
  test("links the promoted feedback via its marker instead of importing a copy", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const connectionId = await seedGithubConnection(ctx, organizationId, {
        autoSyncIssues: true,
      });
      await ctx.db.insert("githubLabelMappings", {
        autoSync: true,
        createdAt: 1,
        githubConnectionId: connectionId,
        githubLabelName: "bug",
        organizationId,
        updatedAt: 1,
      });
      const feedbackId = await seedFeedback(ctx, organizationId);
      const issueId = await seedGithubIssue(ctx, organizationId, connectionId);
      return { connectionId, feedbackId, issueId, organizationId };
    });

    await t.mutation(
      internal.integrations.github.issue_actions.autoImportIssueToFeedback,
      {
        connectionId: ids.connectionId,
        issue: {
          body: `Details\n\n[Open in Reflet](https://x) · \`reflet:${ids.feedbackId}\``,
          htmlUrl: "https://github.com/acme/app/issues/42",
          id: "issue-1",
          labels: ["bug"],
          number: 42,
          state: "open",
          title: "Draft lost on save",
        },
        issueId: ids.issueId,
        organizationId: ids.organizationId,
      }
    );

    const result = await t.run(async (ctx) => ({
      feedback: await ctx.db.query("feedback").collect(),
      row: await ctx.db.get(ids.issueId),
    }));
    expect(result.feedback).toHaveLength(1);
    expect(result.feedback[0].githubIssueNumber).toBe(42);
    expect(result.row?.refletFeedbackId).toBe(ids.feedbackId);
  });
});
