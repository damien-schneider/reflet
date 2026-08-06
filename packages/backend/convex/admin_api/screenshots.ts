import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const listScreenshots = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const screenshots = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return await Promise.all(
      screenshots.map(async (s) => ({
        _id: s._id,
        captureSource: s.captureSource,
        createdAt: s.createdAt,
        filename: s.filename,
        mimeType: s.mimeType,
        pageUrl: s.pageUrl,
        size: s.size,
        url: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : await ctx.storage.getUrl(s.storageId),
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      captureSource: v.union(
        v.literal("widget"),
        v.literal("upload"),
        v.literal("paste")
      ),
      createdAt: v.number(),
      filename: v.string(),
      mimeType: v.string(),
      pageUrl: v.optional(v.string()),
      size: v.number(),
      url: v.union(v.string(), v.null()),
    })
  ),
});

export const deleteScreenshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    screenshotId: v.id("feedbackScreenshots"),
  },
  handler: async (ctx, args) => {
    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }
    if (screenshot.organizationId !== args.organizationId) {
      throw new Error("Screenshot not found");
    }

    await ctx.storage.delete(screenshot.storageId);
    if (screenshot.annotatedStorageId) {
      await ctx.storage.delete(screenshot.annotatedStorageId);
    }

    await ctx.db.delete(args.screenshotId);

    return null;
  },
  returns: v.null(),
});
