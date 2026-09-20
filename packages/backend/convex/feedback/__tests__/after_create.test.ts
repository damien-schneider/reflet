/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import {
  scheduledFunctionNames,
  seedFeedback,
  seedGithubConnection,
  seedOrganization,
} from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { scheduleAfterCreate } from "../after_create";

describe("scheduleAfterCreate", () => {
  test("promotes on create only for approved feedback", async () => {
    const t = convexTest(schema, modules);

    const names = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      await seedGithubConnection(ctx, organizationId, {
        promoteTrigger: "on_create",
      });
      const approvedId = await seedFeedback(ctx, organizationId);
      const pendingId = await seedFeedback(ctx, organizationId, {
        isApproved: false,
      });
      await scheduleAfterCreate(ctx, approvedId, {
        aiEnrichment: false,
        autoTagging: false,
      });
      await scheduleAfterCreate(ctx, pendingId, {
        aiEnrichment: false,
        autoTagging: false,
      });
      return await scheduledFunctionNames(ctx);
    });

    expect(
      names.filter((name) => name.includes("promoteFeedback"))
    ).toHaveLength(1);
    expect(
      names.filter((name) => name.includes("findSimilarFeedback"))
    ).toHaveLength(2);
  });

  test("schedules AI jobs only when asked", async () => {
    const t = convexTest(schema, modules);

    const names = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const feedbackId = await seedFeedback(ctx, organizationId);
      await scheduleAfterCreate(ctx, feedbackId, {
        aiEnrichment: true,
        autoTagging: false,
      });
      return await scheduledFunctionNames(ctx);
    });

    expect(names.some((name) => name.includes("generateClarification"))).toBe(
      true
    );
    expect(names.some((name) => name.includes("processAutoTagging"))).toBe(
      false
    );
  });

  test("defers promotion to triage when auto-tagging will run", async () => {
    const t = convexTest(schema, modules);

    const feedbackId = await t.run(async (ctx) => {
      const orgId = await seedOrganization(ctx);
      await seedGithubConnection(ctx, orgId, { promoteTrigger: "on_create" });
      const id = await seedFeedback(ctx, orgId);
      await scheduleAfterCreate(ctx, id, {
        aiEnrichment: false,
        autoTagging: true,
      });
      return id;
    });

    const deferred = await t.run(
      async (ctx) => await scheduledFunctionNames(ctx)
    );
    expect(
      deferred.filter((name) => name.includes("promoteFeedback"))
    ).toHaveLength(0);

    await t.mutation(internal.feedback.review.releaseAfterTriage, {
      feedbackId,
    });

    const released = await t.run(
      async (ctx) => await scheduledFunctionNames(ctx)
    );
    expect(
      released.filter((name) => name.includes("promoteFeedback"))
    ).toHaveLength(1);
  });
});
