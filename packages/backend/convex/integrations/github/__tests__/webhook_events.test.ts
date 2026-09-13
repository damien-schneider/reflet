/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import schema from "../../../schema";
import {
  seedFeedback,
  seedGithubConnection,
  seedGithubIssue,
  seedOrganization,
} from "../../../test.fixtures";
import { modules } from "../../../test.helpers";

const issuePayload = (
  overrides: Partial<{
    body: string;
    closedAt: number;
    state: "open" | "closed";
    stateReason: string;
    title: string;
  }> = {}
) => ({
  createdAt: 1,
  htmlUrl: "https://github.com/acme/app/issues/42",
  id: "issue-1",
  labels: [],
  number: 42,
  state: "open" as const,
  title: "Draft lost on save",
  updatedAt: 2,
  ...overrides,
});

async function seedLinked(
  t: ReturnType<typeof convexTest>,
  feedbackOverrides: Partial<Doc<"feedback">>
) {
  return await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const connectionId = await seedGithubConnection(ctx, organizationId);
    const feedbackId = await seedFeedback(
      ctx,
      organizationId,
      feedbackOverrides
    );
    await seedGithubIssue(ctx, organizationId, connectionId, {
      refletFeedbackId: feedbackId,
    });
    return { connectionId, feedbackId, organizationId };
  });
}

async function feedbackAfterIssueEvent(
  t: ReturnType<typeof convexTest>,
  ids: {
    connectionId: Id<"githubConnections">;
    feedbackId: Id<"feedback">;
    organizationId: Id<"organizations">;
  },
  action: string,
  issue: ReturnType<typeof issuePayload>
) {
  await t.mutation(
    internal.integrations.github.webhook_events.processIssueWebhook,
    {
      action,
      connectionId: ids.connectionId,
      issue,
      organizationId: ids.organizationId,
    }
  );
  return await t.run(async (ctx) => await ctx.db.get(ids.feedbackId));
}

describe("processIssueWebhook", () => {
  test.each([
    ["completed", "completed"],
    ["not_planned", "closed"],
    [undefined, "closed"],
  ])("closed with state_reason %s → %s", async (stateReason, expected) => {
    const t = convexTest(schema, modules);
    const ids = await seedLinked(t, {});
    const feedback = await feedbackAfterIssueEvent(
      t,
      ids,
      "closed",
      issuePayload({ state: "closed", stateReason })
    );
    expect(feedback?.status).toBe(expected);
  });

  test("reopened moves finished feedback back to open", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedLinked(t, { status: "completed" });
    const feedback = await feedbackAfterIssueEvent(
      t,
      ids,
      "reopened",
      issuePayload()
    );
    expect(feedback?.status).toBe("open");
  });

  test("edited keeps a promoted feedback's title and description", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedLinked(t, { status: "planned" });
    const feedback = await feedbackAfterIssueEvent(
      t,
      ids,
      "edited",
      issuePayload({ body: "rewritten on GitHub", title: "Renamed" })
    );
    expect(feedback?.title).toBe("Draft lost on save");
    expect(feedback?.description).toBe("Clicking save loses the draft");
    expect(feedback?.status).toBe("planned");
  });

  test("edited overwrites an imported feedback", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedLinked(t, { syncedFromGithub: true });
    const feedback = await feedbackAfterIssueEvent(
      t,
      ids,
      "edited",
      issuePayload({ body: "rewritten on GitHub", title: "Renamed" })
    );
    expect(feedback?.title).toBe("Renamed");
    expect(feedback?.description).toBe("rewritten on GitHub");
  });
});

describe("processPullRequestWebhook", () => {
  test("completes referenced feedback once", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedLinked(t, {});
    const pullRequest = {
      baseRef: "main",
      body: `fixes reflet:${ids.feedbackId}`,
      headRef: "fix",
      htmlUrl: "https://github.com/acme/app/pull/7",
      id: "pr-1",
      number: 7,
      title: "Keep the draft",
    };
    const first = await t.mutation(
      internal.integrations.github.webhook_events.processPullRequestWebhook,
      {
        connectionId: ids.connectionId,
        organizationId: ids.organizationId,
        pullRequest,
      }
    );
    const second = await t.mutation(
      internal.integrations.github.webhook_events.processPullRequestWebhook,
      {
        connectionId: ids.connectionId,
        organizationId: ids.organizationId,
        pullRequest,
      }
    );
    const feedback = await t.run(
      async (ctx) => await ctx.db.get(ids.feedbackId)
    );

    expect(first).toEqual({ processed: 1 });
    expect(second).toEqual({ processed: 0 });
    expect(feedback?.status).toBe("completed");
  });
});
