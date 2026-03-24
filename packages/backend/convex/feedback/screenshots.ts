import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getAuthUser } from "../shared/utils";

const annotationValidator = v.object({
  type: v.union(
    v.literal("rectangle"),
    v.literal("arrow"),
    v.literal("text"),
    v.literal("blur")
  ),
  x: v.number(),
  y: v.number(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  endX: v.optional(v.number()),
  endY: v.optional(v.number()),
  color: v.optional(v.string()),
  text: v.optional(v.string()),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getAuthUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generatePublicUploadUrl = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveScreenshot = mutation({
  args: {
    feedbackId: v.id("feedback"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    annotations: v.optional(v.array(annotationValidator)),
    captureSource: v.union(
      v.literal("widget"),
      v.literal("upload"),
      v.literal("paste")
    ),
    pageUrl: v.optional(v.string()),
  },
  returns: v.id("feedbackScreenshots"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    return await ctx.db.insert("feedbackScreenshots", {
      feedbackId: args.feedbackId,
      organizationId: feedback.organizationId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width,
      height: args.height,
      annotations: args.annotations,
      captureSource: args.captureSource,
      pageUrl: args.pageUrl,
      uploadedBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const saveScreenshotPublic = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    annotations: v.optional(v.array(annotationValidator)),
    captureSource: v.union(
      v.literal("widget"),
      v.literal("upload"),
      v.literal("paste")
    ),
    pageUrl: v.optional(v.string()),
    externalUserId: v.optional(v.id("externalUsers")),
  },
  returns: v.id("feedbackScreenshots"),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    return await ctx.db.insert("feedbackScreenshots", {
      feedbackId: args.feedbackId,
      organizationId: feedback.organizationId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width,
      height: args.height,
      annotations: args.annotations,
      captureSource: args.captureSource,
      pageUrl: args.pageUrl,
      externalUserId: args.externalUserId,
      createdAt: Date.now(),
    });
  },
});

export const updateAnnotations = mutation({
  args: {
    screenshotId: v.id("feedbackScreenshots"),
    annotations: v.array(annotationValidator),
    annotatedStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    await ctx.db.patch(args.screenshotId, {
      annotations: args.annotations,
      annotatedStorageId: args.annotatedStorageId,
    });

    return null;
  },
});

export const getByFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      storageId: v.id("_storage"),
      annotatedStorageId: v.optional(v.id("_storage")),
      filename: v.string(),
      mimeType: v.string(),
      size: v.number(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      annotations: v.optional(v.array(annotationValidator)),
      captureSource: v.union(
        v.literal("widget"),
        v.literal("upload"),
        v.literal("paste")
      ),
      pageUrl: v.optional(v.string()),
      url: v.union(v.string(), v.null()),
      annotatedUrl: v.union(v.string(), v.null()),
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
        storageId: s.storageId,
        annotatedStorageId: s.annotatedStorageId,
        filename: s.filename,
        mimeType: s.mimeType,
        size: s.size,
        width: s.width,
        height: s.height,
        annotations: s.annotations,
        captureSource: s.captureSource,
        pageUrl: s.pageUrl,
        url: await ctx.storage.getUrl(s.storageId),
        annotatedUrl: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : null,
        createdAt: s.createdAt,
      }))
    );
  },
});

export const getByFeedbackPublic = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      filename: v.string(),
      mimeType: v.string(),
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
        url: s.annotatedStorageId
          ? await ctx.storage.getUrl(s.annotatedStorageId)
          : await ctx.storage.getUrl(s.storageId),
        createdAt: s.createdAt,
      }))
    );
  },
});

export const deleteScreenshot = mutation({
  args: {
    screenshotId: v.id("feedbackScreenshots"),
  },
  returns: v.null(),
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
});
