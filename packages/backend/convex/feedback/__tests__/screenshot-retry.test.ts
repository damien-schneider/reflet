import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

it("saves different images and reuses the same attachment when a save is retried", async () => {
  const test = convexTest(schema, modules);
  const capture = await test.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: false,
      name: "Demo",
      slug: "demo",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    const feedbackId = await ctx.db.insert("feedback", {
      commentCount: 0,
      createdAt: Date.now(),
      description: "Two screens",
      isApproved: true,
      isPinned: false,
      organizationId,
      status: "open",
      title: "Capture report",
      updatedAt: Date.now(),
      voteCount: 0,
    });
    const storageId = await ctx.storage.store(new Blob(["first"]));
    const secondStorageId = await ctx.storage.store(new Blob(["second"]));
    return { feedbackId, organizationId, secondStorageId, storageId };
  });
  const params = {
    captureSource: "widget" as const,
    feedbackId: capture.feedbackId,
    filename: "screenshot-1.png",
    mimeType: "image/png",
    organizationId: capture.organizationId,
    size: 5,
    storageId: capture.storageId,
  };
  const firstId = await test.mutation(
    internal.feedback.screenshots.saveScreenshotPublic,
    params
  );
  const retryId = await test.mutation(
    internal.feedback.screenshots.saveScreenshotPublic,
    params
  );
  const secondId = await test.mutation(
    internal.feedback.screenshots.saveScreenshotPublic,
    {
      ...params,
      filename: "screenshot-2.png",
      storageId: capture.secondStorageId,
    }
  );
  expect(retryId).toBe(firstId);
  expect(secondId).not.toBe(firstId);
  const attachments = await test.run((ctx) =>
    ctx.db.query("feedbackScreenshots").collect()
  );
  expect(attachments).toHaveLength(2);
});
