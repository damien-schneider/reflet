import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { parseId, parseJsonBody } from "./helpers";
import {
  authenticateApiRequest,
  checkOrganizationAccess,
} from "./lib/api_auth";
import {
  errorResponse,
  jsonResponse,
  optionalNumberField,
  optionalStringField,
  parseOptionalId,
  stringFieldOr,
} from "./lib/api_helpers";

type Router = ReturnType<typeof httpRouter>;

const createFeedbackSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tagId: z.string().optional(),
});

const voteFeedbackSchema = z.object({
  feedbackId: z.string().optional(),
  voteType: z.enum(["upvote", "downvote"]).optional(),
});

const commentBodySchema = z.object({
  feedbackId: z.string().optional(),
  body: z.string().optional(),
  parentId: z.string().optional(),
});

const feedbackIdBodySchema = z.object({
  feedbackId: z.string().optional(),
});

export function registerFeedbackWriteRoutes(http: Router): void {
  // POST /api/v1/feedback/create - Create new feedback
  http.route({
    path: "/api/v1/feedback/create",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        let body: z.infer<typeof createFeedbackSchema>;
        try {
          body = createFeedbackSchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const { title, description, tagId } = body;

        if (!(title && description)) {
          return errorResponse("Title and description are required", 400);
        }

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public_mutations.createFeedbackByOrganization,
          {
            organizationId,
            title,
            description,
            tagId: parseOptionalId<"tags">(tagId),
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to create feedback",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/vote - Vote on feedback
  http.route({
    path: "/api/v1/feedback/vote",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId, isSecretKey } = authResult.auth;

        if (!externalUserId) {
          return errorResponse(
            "User identification required. Provide X-User-Token header.",
            401
          );
        }

        let body: z.infer<typeof voteFeedbackSchema>;
        try {
          body = voteFeedbackSchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const { feedbackId, voteType } = body;

        if (!feedbackId) {
          return errorResponse("Feedback ID is required", 400);
        }

        const access = await checkOrganizationAccess(
          ctx,
          organizationId,
          isSecretKey
        );
        if (!access.allowed) {
          return access.response;
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public_mutations.voteFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(feedbackId, "feedbackId"),
            externalUserId,
            voteType,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to vote",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/comment - Add comment to feedback
  http.route({
    path: "/api/v1/feedback/comment",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId } = authResult.auth;

        if (!externalUserId) {
          return errorResponse(
            "User identification required. Provide X-User-Token header.",
            401
          );
        }

        let body: z.infer<typeof commentBodySchema>;
        try {
          body = commentBodySchema.parse(await request.json());
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        if (!(body.feedbackId && body.body)) {
          return errorResponse(
            "Feedback ID and comment body are required",
            400
          );
        }

        const result = await ctx.runMutation(
          internal.feedback.api_public_mutations.addCommentByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            body: body.body,
            parentId: parseOptionalId<"comments">(body.parentId),
            externalUserId,
          }
        );

        return jsonResponse(result, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to add comment",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/subscribe - Subscribe to feedback updates
  http.route({
    path: "/api/v1/feedback/subscribe",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { organizationId, externalUserId } = authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = feedbackIdBodySchema.parse(await request.json());

      if (!body.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      try {
        const result = await ctx.runMutation(
          internal.feedback.api_public_mutations
            .subscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            externalUserId,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to subscribe",
          400
        );
      }
    }),
  });

  // POST /api/v1/feedback/unsubscribe - Unsubscribe from feedback updates
  http.route({
    path: "/api/v1/feedback/unsubscribe",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await authenticateApiRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const { organizationId, externalUserId } = authResult.auth;

      if (!externalUserId) {
        return errorResponse(
          "User identification required. Provide X-User-Token header.",
          401
        );
      }

      const body = feedbackIdBodySchema.parse(await request.json());

      if (!body.feedbackId) {
        return errorResponse("Feedback ID is required", 400);
      }

      try {
        const result = await ctx.runMutation(
          internal.feedback.api_public_mutations
            .unsubscribeFeedbackByOrganization,
          {
            organizationId,
            feedbackId: parseId<"feedback">(body.feedbackId, "feedbackId"),
            externalUserId,
          }
        );

        return jsonResponse(result);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Failed to unsubscribe",
          400
        );
      }
    }),
  });

  // POST /api/v1/feedback/screenshot/upload-url - Generate upload URL for screenshot
  http.route({
    path: "/api/v1/feedback/screenshot/upload-url",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const uploadUrl = await ctx.runMutation(
          internal.feedback.screenshots.generatePublicUploadUrl,
          {}
        );

        return jsonResponse({ uploadUrl });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/feedback/screenshot/save - Save screenshot metadata after upload
  http.route({
    path: "/api/v1/feedback/screenshot/save",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { externalUserId } = authResult.auth;

        const bodyResult = await parseJsonBody(request);
        if (!bodyResult.success) {
          return bodyResult.response;
        }
        const { body } = bodyResult;

        const feedbackId = body.feedbackId as string | undefined;
        const storageId = body.storageId as string | undefined;

        if (!(feedbackId && storageId)) {
          return errorResponse("feedbackId and storageId are required", 400);
        }

        const screenshotId = await ctx.runMutation(
          internal.feedback.screenshots.saveScreenshotPublic,
          {
            feedbackId: feedbackId as Id<"feedback">,
            storageId: storageId as Id<"_storage">,
            filename: stringFieldOr(body, "filename", "screenshot.png"),
            mimeType: stringFieldOr(body, "mimeType", "image/png"),
            size: optionalNumberField(body, "size") ?? 0,
            width: optionalNumberField(body, "width"),
            height: optionalNumberField(body, "height"),
            captureSource: "widget",
            pageUrl: optionalStringField(body, "pageUrl"),
            externalUserId,
          }
        );

        return jsonResponse({ screenshotId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });
}
