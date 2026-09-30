import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server";
import {
  isOrgMemberViewer,
  requireAuthUser,
  requireOrgMember,
} from "../shared/access";
import {
  captureSourceValidator,
  screenshotAnnotationValidator,
} from "./tableFields";

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ATTACH_WINDOW_MS = 30 * 60 * 1000;
const MAX_PUBLIC_SCREENSHOTS_PER_FEEDBACK = 10;
const SCREENSHOT_CONTENT_TYPES: Record<string, true> = {
  "image/avif": true,
  "image/gif": true,
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

async function isStorageAttached(
  ctx: QueryCtx,
  storageId: Id<"_storage">
): Promise<boolean> {
  const asOriginal = await ctx.db
    .query("feedbackScreenshots")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (asOriginal) {
    return true;
  }
  const asAnnotated = await ctx.db
    .query("feedbackScreenshots")
    .withIndex("by_annotated_storage", (q) =>
      q.eq("annotatedStorageId", storageId)
    )
    .first();
  return asAnnotated !== null;
}

// Storage is shared across tenants: only accept a just-uploaded, unattached image.
async function requireFreshImageUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">
): Promise<{ contentType: string; size: number }> {
  const file = await ctx.db.system.get(storageId);
  if (
    !file ||
    Date.now() - file._creationTime > ATTACH_WINDOW_MS ||
    (await isStorageAttached(ctx, storageId))
  ) {
    throw new Error("Upload not found");
  }
  const contentType = file.contentType ?? "";
  if (!SCREENSHOT_CONTENT_TYPES[contentType]) {
    throw new Error("Screenshots must be PNG, JPEG, WebP, GIF or AVIF images");
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error("Screenshots must be 10 MB or smaller");
  }
  return { contentType, size: file.size };
}

async function requirePublicScreenshotSlot(
  ctx: MutationCtx,
  feedbackId: Id<"feedback">
): Promise<void> {
  const attached = await ctx.db
    .query("feedbackScreenshots")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .take(MAX_PUBLIC_SCREENSHOTS_PER_FEEDBACK);
  if (attached.length >= MAX_PUBLIC_SCREENSHOTS_PER_FEEDBACK) {
    throw new Error("This feedback already has the maximum screenshots");
  }
}

export async function deleteScreenshotRecord(
  ctx: MutationCtx,
  screenshot: Doc<"feedbackScreenshots">
): Promise<void> {
  await ctx.db.delete(screenshot._id);
  const storageIds = new Set([screenshot.storageId]);
  if (screenshot.annotatedStorageId) {
    storageIds.add(screenshot.annotatedStorageId);
  }
  for (const storageId of storageIds) {
    if (!(await isStorageAttached(ctx, storageId))) {
      await ctx.storage.delete(storageId);
    }
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);
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
    captureSource: captureSourceValidator,
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

    const { user } = await requireOrgMember(ctx, feedback.organizationId);
    const upload = await requireFreshImageUpload(ctx, args.storageId);

    return await ctx.db.insert("feedbackScreenshots", {
      annotations: args.annotations,
      captureSource: args.captureSource,
      createdAt: Date.now(),
      feedbackId: args.feedbackId,
      filename: args.filename,
      height: args.height,
      mimeType: upload.contentType,
      organizationId: feedback.organizationId,
      pageUrl: args.pageUrl,
      size: upload.size,
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
    captureSource: captureSourceValidator,
    externalUserId: v.optional(v.id("externalUsers")),
    feedbackId: v.id("feedback"),
    filename: v.string(),
    height: v.optional(v.number()),
    organizationId: v.id("organizations"),
    pageUrl: v.optional(v.string()),
    requireReporter: v.boolean(),
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const isFreshReport =
      feedback.externalUserId === args.externalUserId &&
      Date.now() - feedback._creationTime <= ATTACH_WINDOW_MS;
    if (args.requireReporter && !isFreshReport) {
      throw new Error(
        "Screenshots can only be attached by the reporter right after submitting"
      );
    }

    const existing = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (existing?.feedbackId === args.feedbackId) {
      return existing._id;
    }

    if (args.requireReporter) {
      await requirePublicScreenshotSlot(ctx, args.feedbackId);
    }
    if (args.annotatedStorageId === args.storageId) {
      throw new Error("The annotated image must be a separate upload");
    }
    const upload = await requireFreshImageUpload(ctx, args.storageId);
    if (args.annotatedStorageId) {
      await requireFreshImageUpload(ctx, args.annotatedStorageId);
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
      mimeType: upload.contentType,
      organizationId: feedback.organizationId,
      pageUrl: args.pageUrl,
      size: upload.size,
      storageId: args.storageId,
      width: args.width,
    });
  },
  returns: v.id("feedbackScreenshots"),
});

export const getByFeedback = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.deletedAt) {
      return [];
    }

    const organization = await ctx.db.get(feedback.organizationId);
    if (!organization) {
      return [];
    }

    const publiclyVisible = organization.isPublic && feedback.isApproved;
    const canViewScreenshots =
      publiclyVisible ||
      (await isOrgMemberViewer(ctx, feedback.organizationId));
    if (!canViewScreenshots) {
      return [];
    }

    const screenshots = await ctx.db
      .query("feedbackScreenshots")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    return await Promise.all(
      screenshots.map(async (s) => ({
        _id: s._id,
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
        url: await ctx.storage.getUrl(s.storageId),
        width: s.width,
      }))
    );
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackScreenshots"),
      annotatedUrl: v.union(v.string(), v.null()),
      annotations: v.optional(v.array(screenshotAnnotationValidator)),
      captureSource: captureSourceValidator,
      createdAt: v.number(),
      filename: v.string(),
      height: v.optional(v.number()),
      mimeType: v.string(),
      pageUrl: v.optional(v.string()),
      size: v.number(),
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
    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    await requireOrgMember(ctx, screenshot.organizationId);
    await deleteScreenshotRecord(ctx, screenshot);

    return null;
  },
  returns: v.null(),
});
