import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const listScreenshots = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      filename: v.string(),
      mimeType: v.string(),
      size: v.number(),
      captureSource: v.union(
        v.literal("widget"),
        v.literal("upload"),
        v.literal("paste")
      ),
      pageUrl: v.optional(v.string()),
      url: v.union(v.string(), v.null()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return await Promise.all(
      screenshots.map(async (s) => ({
        _id: s._id,
        filename: s.filename,
        mimeType: s.mimeType,
        size: s.size,
        captureSource: s.captureSource,
        pageUrl: s.pageUrl,
        url: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : await ctx.storage.getUrl(s.storageId),
        createdAt: s.createdAt,
      }))
    );
  },
});

export const deleteScreenshot = internalMutation({
  args: {
    screenshotId: v.id("feedbackScreenshots"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    await ctx.storage.delete(screenshot.storageId);
    if (screenshot.annotatedStorageId) {
      await ctx.storage.delete(screenshot.annotatedStorageId);
    }

    await ctx.db.delete(args.screenshotId);

    return null;
  },
});
