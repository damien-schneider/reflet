import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

test("anonymous visitors can read screenshots only for approved feedback in a public organization", async () => {
  const testClient = convexTest(schema, modules);
  const { feedbackId, organizationId, screenshotId } = await testClient.run(
    async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Public Org",
        slug: "public-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });
      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Screenshot report",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Visible feedback",
        updatedAt: Date.now(),
        voteCount: 0,
      });
      const storageId = await ctx.storage.store(new Blob(["image"]));
      const screenshotId = await ctx.db.insert("feedbackScreenshots", {
        captureSource: "upload",
        createdAt: Date.now(),
        feedbackId,
        filename: "capture.png",
        mimeType: "image/png",
        organizationId,
        size: 5,
        storageId,
      });
      return { feedbackId, organizationId, screenshotId };
    }
  );

  const visible = await testClient.query(
    api.feedback.screenshots.getByFeedback,
    {
      feedbackId,
    }
  );
  expect(visible.map((screenshot) => screenshot._id)).toEqual([screenshotId]);

  await testClient.run(async (ctx) => {
    await ctx.db.patch(feedbackId, { isApproved: false });
  });
  expect(
    await testClient.query(api.feedback.screenshots.getByFeedback, {
      feedbackId,
    })
  ).toEqual([]);

  await testClient.run(async (ctx) => {
    await ctx.db.patch(feedbackId, { isApproved: true });
    await ctx.db.patch(organizationId, { isPublic: false });
  });
  expect(
    await testClient.query(api.feedback.screenshots.getByFeedback, {
      feedbackId,
    })
  ).toEqual([]);
});
