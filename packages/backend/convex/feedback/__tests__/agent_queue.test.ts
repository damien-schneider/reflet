/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { CLAIM_TTL_MS } from "../agent_queue";

describe("agent queue", () => {
  test("orders by priority, then votes, and skips live claims", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const low = await seedFeedback(ctx, organizationId, {
        priority: "low",
        title: "low",
        voteCount: 50,
      });
      const highClaimed = await seedFeedback(ctx, organizationId, {
        claimedAt: Date.now(),
        claimedBy: "other-agent",
        priority: "high",
        title: "high claimed",
      });
      const highExpired = await seedFeedback(ctx, organizationId, {
        claimedAt: Date.now() - CLAIM_TTL_MS - 1,
        claimedBy: "other-agent",
        priority: "high",
        title: "high expired",
      });
      const aiHigh = await seedFeedback(ctx, organizationId, {
        aiPriority: "high",
        title: "ai high",
        voteCount: 3,
      });
      await seedFeedback(ctx, organizationId, {
        status: "completed",
        title: "done",
      });
      return { aiHigh, highClaimed, highExpired, low, organizationId };
    });

    const next = await t.query(internal.feedback.agent_queue.nextFeedback, {
      organizationId: ids.organizationId,
    });

    expect(next.map((item) => item.title)).toEqual([
      "ai high",
      "high expired",
      "low",
    ]);
  });

  test("claimNext hands out distinct items and marks them in progress", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await t.run(async (ctx) => {
      const id = await seedOrganization(ctx);
      await seedFeedback(ctx, id, { title: "a" });
      await seedFeedback(ctx, id, { title: "b" });
      return id;
    });

    const first = await t.mutation(internal.feedback.agent_queue.claimNext, {
      claimedBy: "agent-1",
      organizationId,
    });
    const second = await t.mutation(internal.feedback.agent_queue.claimNext, {
      claimedBy: "agent-2",
      organizationId,
    });
    const third = await t.mutation(internal.feedback.agent_queue.claimNext, {
      claimedBy: "agent-3",
      organizationId,
    });

    expect(first?.id).not.toBe(second?.id);
    expect(first?.status).toBe("in_progress");
    expect(first?.claimedBy).toBe("agent-1");
    expect(third).toBeNull();
  });

  test("claimFeedback rejects a foreign live claim", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const feedbackId = await seedFeedback(ctx, organizationId, {
        claimedAt: Date.now(),
        claimedBy: "agent-1",
      });
      return { feedbackId, organizationId };
    });

    await expect(
      t.mutation(internal.feedback.agent_queue.claimFeedback, {
        claimedBy: "agent-2",
        feedbackId: ids.feedbackId,
        organizationId: ids.organizationId,
      })
    ).rejects.toThrow("already claimed by agent-1");

    const own = await t.mutation(internal.feedback.agent_queue.claimFeedback, {
      claimedBy: "agent-1",
      feedbackId: ids.feedbackId,
      organizationId: ids.organizationId,
    });
    expect(own.claimedBy).toBe("agent-1");
  });
});
