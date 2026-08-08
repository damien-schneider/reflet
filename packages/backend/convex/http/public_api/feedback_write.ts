import type { httpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import {
  errorResponse,
  jsonResponse,
  optionalStorageId,
  parseId,
  parseStorageId,
} from "../helpers";
import {
  checkOrganizationAccess,
  checkWriteQuota,
  parseOptionalId,
} from "./auth";
import { publicApiRoute, readJsonBody } from "./route";
import {
  commentBodySchema,
  createFeedbackSchema,
  feedbackIdBodySchema,
  saveScreenshotSchema,
  voteFeedbackSchema,
} from "./schemas";

type Router = ReturnType<typeof httpRouter>;

export function registerFeedbackWriteRoutes(http: Router): void {
  // POST /api/v1/feedback/create - Create new feedback
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, createFeedbackSchema);
      if (!body.success) {
        return body.response;
      }

      const { title, description, tagId, context } = body.data;
      if (!(title && description)) {
        return errorResponse("Title and description are required", 400);
      }

      const quota = await checkWriteQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }

      const result = await ctx.runMutation(
        internal.feedback.api_public_write.createFeedbackByOrganization,
        {
          context,
          description,
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          organizationId: auth.organizationId,
          tagId: parseOptionalId<"tags">(tagId),
          title,
        }
      );

      await ctx.runMutation(internal.feedback.api_auth.logApiRequest, {
        endpoint: "/api/v1/feedback/create",
        method: "POST",
        organizationApiKeyId: auth.organizationApiKeyId,
        organizationId: auth.organizationId,
        statusCode: 201,
        userAgent: request.headers.get("User-Agent") ?? undefined,
      });

      return jsonResponse(result, 201);
    }),
    method: "POST",
    path: "/api/v1/feedback/create",
  });

  // POST /api/v1/feedback/vote - Vote on feedback
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      if (!auth.externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = await readJsonBody(request, voteFeedbackSchema);
      if (!body.success) {
        return body.response;
      }

      const { feedbackId, voteType } = body.data;
      if (!feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      const access = await checkOrganizationAccess(
        ctx,
        auth.organizationId,
        auth.isSecretKey
      );
      if (!access.allowed) {
        return access.response;
      }

      const result = await ctx.runMutation(
        internal.feedback.api_public_write.voteFeedbackByOrganization,
        {
          externalUserId: auth.externalUserId,
          feedbackId: parseId<"feedback">(feedbackId, "feedbackId"),
          organizationId: auth.organizationId,
          voteType,
        }
      );

      return jsonResponse(result);
    }),
    method: "POST",
    path: "/api/v1/feedback/vote",
  });

  // POST /api/v1/feedback/comment - Add comment to feedback
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      if (!auth.externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = await readJsonBody(request, commentBodySchema);
      if (!body.success) {
        return body.response;
      }

      if (!(body.data.feedbackId && body.data.body)) {
        return errorResponse("Feedback ID and comment body are required", 400);
      }

      const quota = await checkWriteQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }

      const result = await ctx.runMutation(
        internal.feedback.api_public_write.addCommentByOrganization,
        {
          body: body.data.body,
          externalUserId: auth.externalUserId,
          feedbackId: parseId<"feedback">(body.data.feedbackId, "feedbackId"),
          organizationId: auth.organizationId,
          parentId: parseOptionalId<"comments">(body.data.parentId),
        }
      );

      return jsonResponse(result, 201);
    }),
    method: "POST",
    path: "/api/v1/feedback/comment",
  });

  // POST /api/v1/feedback/subscribe - Subscribe to feedback updates
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      if (!auth.externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = await readJsonBody(request, feedbackIdBodySchema);
      if (!body.success) {
        return body.response;
      }

      if (!body.data.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      const result = await ctx.runMutation(
        internal.feedback.api_public_write.subscribeFeedbackByOrganization,
        {
          externalUserId: auth.externalUserId,
          feedbackId: parseId<"feedback">(body.data.feedbackId, "feedbackId"),
          organizationId: auth.organizationId,
        }
      );

      return jsonResponse(result);
    }),
    method: "POST",
    path: "/api/v1/feedback/subscribe",
  });

  // POST /api/v1/feedback/unsubscribe - Unsubscribe from feedback updates
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      if (!auth.externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = await readJsonBody(request, feedbackIdBodySchema);
      if (!body.success) {
        return body.response;
      }

      if (!body.data.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      const result = await ctx.runMutation(
        internal.feedback.api_public_write.unsubscribeFeedbackByOrganization,
        {
          externalUserId: auth.externalUserId,
          feedbackId: parseId<"feedback">(body.data.feedbackId, "feedbackId"),
          organizationId: auth.organizationId,
        }
      );

      return jsonResponse(result);
    }),
    method: "POST",
    path: "/api/v1/feedback/unsubscribe",
  });

  // POST /api/v1/feedback/screenshot/upload-url - Generate upload URL for screenshot
  http.route({
    handler: publicApiRoute(async ({ auth, ctx }) => {
      const quota = await checkWriteQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }

      const uploadUrl = await ctx.runMutation(
        internal.feedback.screenshots.generatePublicUploadUrl,
        {}
      );

      return jsonResponse({ uploadUrl });
    }),
    method: "POST",
    path: "/api/v1/feedback/screenshot/upload-url",
  });

  // POST /api/v1/feedback/screenshot/save - Save screenshot metadata after upload
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, saveScreenshotSchema);
      if (!body.success) {
        return errorResponse("feedbackId and storageId are required", 400);
      }

      const quota = await checkWriteQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }

      const screenshotId = await ctx.runMutation(
        internal.feedback.screenshots.saveScreenshotPublic,
        {
          annotatedStorageId: optionalStorageId(body.data.annotatedStorageId),
          annotations: body.data.annotations,
          captureSource: body.data.captureSource ?? "widget",
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          feedbackId: parseId<"feedback">(body.data.feedbackId, "feedbackId"),
          filename: body.data.filename ?? "screenshot.png",
          height: body.data.height,
          mimeType: body.data.mimeType ?? "image/png",
          organizationId: auth.organizationId,
          pageUrl: body.data.pageUrl,
          size: body.data.size ?? 0,
          storageId: parseStorageId(body.data.storageId, "storageId"),
          width: body.data.width,
        }
      );

      return jsonResponse({ screenshotId });
    }),
    method: "POST",
    path: "/api/v1/feedback/screenshot/save",
  });
}
