import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { screenshotAnnotationValidator } from "./tableFields";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
  returns: v.string(),
});

export const generatePublicUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
  returns: v.string(),
});

export const saveScreenshot = mutation({
  args: {
    annotations: v.optional(v.array(screenshotAnnotationValidator)),
    captureSource: v.union(
      v.literal("widget"),
      v.literal("upload"),
      v.literal("paste")
    ),
    feedbackId: v.id("feedback"),
    filename: v.string(),
    height: v.optional(v.number()),
    mimeType: v.string(),
    pageUrl: v.optional(v.string()),
    size: v.number(),
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    return await ctx.db.insert("feedbackScreenshots", {
      annotations: args.annotations,
      captureSource: args.captureSource,
      createdAt: Date.now(),
      feedbackId: args.feedbackId,
      filename: args.filename,
      height: args.height,
      mimeType: args.mimeType,
      organizationId: feedback.organizationId,
      pageUrl: args.pageUrl,
      size: args.size,
      storageId: args.storageId,
      uploadedBy: user._id,
      width: args.width,
    });
  },
  returns: v.id("feedbackScreenshots"),
});

export const saveScreenshotPublic = internalMutation({
  args: {
    annotatedStorageId: v.optional(v.id("_storage")),
    annotations: v.optional(v.array(screenshotAnnotationValidator)),
    captureSource: v.union(
      v.literal("widget"),
      v.literal("upload"),
      v.literal("paste")
    ),
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    filename: v.string(),
    height: v.optional(v.number()),
    mimeType: v.string(),
    pageUrl: v.optional(v.string()),
    size: v.number(),
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    return await ctx.db.insert("feedbackScreenshots", {
      annotatedStorageId: args.annotatedStorageId,
      annotations: args.annotations,
      captureSource: args.captureSource,
      createdAt: Date.now(),
      externalUserId: args.externalUserId,
      feedbackId: args.feedbackId,
      filename: args.filename,
      height: args.height,
      mimeType: args.mimeType,
      organizationId: feedback.organizationId,
      pageUrl: args.pageUrl,
      size: args.size,
      storageId: args.storageId,
      width: args.width,
    });
  },
  returns: v.id("feedbackScreenshots"),
});

export const updateAnnotations = mutation({
  args: {
    annotatedStorageId: v.optional(v.id("_storage")),
    annotations: v.array(screenshotAnnotationValidator),
    screenshotId: v.id("feedbackScreenshots"),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    await ctx.db.patch(args.screenshotId, {
      annotatedStorageId: args.annotatedStorageId,
      annotations: args.annotations,
    });

    return null;
  },
  returns: v.null(),
});

export const getByFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return await Promise.all(
      screenshots.map(async (s) => ({
        _id: s._id,
        annotatedStorageId: s.annotatedStorageId,
        annotatedUrl: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : null,
        annotations: s.annotations,
        captureSource: s.captureSource,
        createdAt: s.createdAt,
        filename: s.filename,
        height: s.height,
        mimeType: s.mimeType,
        pageUrl: s.pageUrl,
        size: s.size,
        storageId: s.storageId,
        url: await ctx.storage.getUrl(s.storageId),
        width: s.width,
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      annotatedStorageId: v.optional(v.id("_storage")),
      annotatedUrl: v.union(v.string(), v.null()),
      annotations: v.optional(v.array(screenshotAnnotationValidator)),
      captureSource: v.union(
        v.literal("widget"),
        v.literal("upload"),
        v.literal("paste")
      ),
      createdAt: v.number(),
      filename: v.string(),
      height: v.optional(v.number()),
      mimeType: v.string(),
      pageUrl: v.optional(v.string()),
      size: v.number(),
      storageId: v.id("_storage"),
      url: v.union(v.string(), v.null()),
      width: v.optional(v.number()),
    })
  ),
});

export const getByFeedbackPublic = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return await Promise.all(
      screenshots.map(async (s) => ({
        _id: s._id,
        createdAt: s.createdAt,
        filename: s.filename,
        mimeType: s.mimeType,
        url: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : await ctx.storage.getUrl(s.storageId),
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      createdAt: v.number(),
      filename: v.string(),
      mimeType: v.string(),
      url: v.union(v.string(), v.null()),
    })
  ),
});

export const deleteScreenshot = mutation({
  args: {
    screenshotId: v.id("feedbackScreenshots"),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

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
  returns: v.null(),
});
