/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
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
});
